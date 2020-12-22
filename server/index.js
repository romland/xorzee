"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const path = require('path');
const cp = require('child_process');
const net = require('net');
const dgram = require('dgram');
const WebSocket = require('@clusterws/cws');
const Split = require('stream-split');
const NALSeparator = new Buffer([0, 0, 0, 1]);
const express = require('express');
const systemd = require('systemd');
const app = express();
const conf = require('nconf');

const BinaryRingBuffer = require('@cisl/binary-ring-buffer');

const { BufferListStream } = require('bl');	// XXX: It's a bit silly to include this one, but it saved me a little time.

const mvrproc = require("./lib/mvrprocessor.js");
const MvrProcessor = mvrproc.default;
const MvrFilterFlags = mvrproc.MvrFilterFlags;

const CameraDiscovery = require("./lib/CameraDiscovery.js").default;

const START_SKIP_MOTION_FRAMES = 17;

	var neighbours;
	var wsServer;
	var motionWsServer;
	var headers = [];
	var mvrProcessor;
	var ffmpegProc;
	var recording = false;
	var recordBuffer;
	var cameraDiscoverer;


	conf.argv().defaults({
		name		: "Office cam",
		tcpport		: 8000,		// for camera
		motionport	: 8001,		// for camera (motion data)

		queryport	: 8080,		// for client (content)
		wsport		: 8081,		// for client (stream)
		motionwsport: 8082,		// for client (motion stream)

		limit		: 150,		// max number clients allowed

		discovery	: true,

//		framerate	: 15,
//		framerate	: 4,

		framerate	: 24,
		width		: 1920,	height		: 1080,
//		width: 1280, height: 722,
//		width: 640, height: 482,		// Warning, the height CAN NOT be divisible by 16! (bit of a bug!)
		bitrate		: 1700000,
		mayrecord	: true,				// If true, will allocate a buffer of the past (10 MiB)
		rbuffersize	: (3 * 1024 * 1024)
	});


	function startCamera()
	{
		var camProc = cp.spawn('/bin/sh', [
			'-c',
			`/usr/bin/raspivid ` +
			(logger.level === "debug" ? `--verbose ` : "") +
			// it seems decoder gets some issues with this... cannot reproduce 100% of the time, tho.
			// A low g value will make every frame appear like it's a motion-flash (and is thus ignored).
//			`-g 1` +		// A low value here will make ffmpeg pick up the video quicker -- drawbacks other than bandwidth?
			`--inline ` +
			`--spstimings ` +
			`--hflip ` +
			`--vflip ` +
			`--nopreview ` + 
			`--width ${conf.get("width")} ` +
			`--height ${conf.get("height")} ` +
			`--timeout 0 ` +
			`--framerate ${conf.get("framerate")} ` +
			`--bitrate ${conf.get("bitrate")} ` +
			`--profile baseline ` +
			`--vectors tcp://127.0.0.1:${conf.get("motionport")} ` +
			`--output - | /bin/nc localhost ${conf.get("tcpport")}`
		]);

		camProc.stdout.setEncoding('utf8');
		camProc.stdout.on('data', function(data) {
			logger.debug('Cam-stdout: %s', data);
		});

		camProc.stderr.setEncoding('utf8');
		camProc.stderr.on('data', function(data) {
		    logger.debug('Cam-stderr: %s', data);
		});

		camProc.on('close', function(code) {
		    logger.debug('Cam-close code: %d', code);
		});

	}


	function setupWebServer()
	{
		app.use(express.static( path.join(__dirname, '../client') ));

		app.get('/', (req, res) => {
			var count = 0;

			wsServer.clients.forEach((ws) => {
				if (ws.readyState == 1) {
					count++;
				}
			})

			res.set('Content-type', 'text/plain');
			res.send(count.toString());
		});

		app.listen(conf.get('queryport'), () => {
			logger.info("Listening for HTTP requests on port %d", conf.get('queryport'));
		});
	}

	function broadcast(data)
	{
		wsServer.clients.forEach((ws) => {
			if (ws.readyState === 1) {
				ws.send(data, { binary: true });
			}
		});
	}

	function broadcastOverlay(data, len, binary = true)
	{
		motionWsServer.clients.forEach((ws) => {
			if (ws.readyState === 1) {
				ws.send(data, { binary: binary });
			}
		});
	}


	function setupMotionListener()
	{
		const tcpServer = net.createServer((socket) => {
			logger.info('Motion streamer created');

			socket.on('end', () => {
				logger.info('Motion streamer disconnected');
			});

			let vectorLines = Math.floor( conf.get("height") / 16) + 1;
			let vectorsPerLine = Math.floor( conf.get("width") / 16) + 1;
			let frameLength = vectorsPerLine * vectorLines * 4;
			let bl = new BufferListStream();
			let frameData = null;
			let frameCount = 0;
			let clusters = null;
			let str;

			socket.on('data', (data) => {
				bl.append(data);

				while(true) {
					if(bl.length < frameLength) {
						break;
					}

					if(START_SKIP_MOTION_FRAMES > frameCount++) {
						logger.debug("Skipping motion frame %d/%d...", frameCount, START_SKIP_MOTION_FRAMES);
						bl.consume(frameLength);
						return;
					}

					// Protect against eating too much damn memory if we are too slow.
					if(bl.length > frameLength * 3) {
						logger.warn("Discarding motion frames, we are probably too slow.");
						do {
							bl.consume(frameLength);
						} while(bl.length > (frameLength * 3))
					}

					//frameData = bl.shallowSlice(0, frameLength);      // argh, this does not expose fill() -- oh well, a memory copy then :(
					frameData = bl.slice(0, frameLength);

//					console.time("processFrame");
					clusters = mvrProcessor.processFrame(
						frameData,
						MvrFilterFlags.MAGNITUDE_LT_300 | MvrFilterFlags.DX_DY_LT_2 | MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE
					);
//					console.timeEnd("processFrame");

					bl.consume(frameLength);

					// broadcast raw data to client.
					broadcastOverlay(frameData, frameLength, true);

					// broadcast relevant data (such as bounding boxes) to client
					broadcastMessage(
						{
							clusters : clusters,
							history : mvrProcessor.getActiveClusters()
						}
					);
				}

			}).on('error', (e) => {
				logger.error('motion splitter error %s', e);
				process.exit(0);
			})

		});

		tcpServer.listen(conf.get('motionport'));

		if (conf.get('motionport') == 'systemd') {
			logger.info('Motion TCP server listening on systemd socket');
		} else {
			var address = tcpServer.address();
			if (address) {
				logger.info(`Motion TCP server listening on %s:%d`, address.address, address.port);
			}
		}

	}

	function setupRecorder()
	{
		recordBuffer = new BinaryRingBuffer(conf.get("rbuffersize"));
	}

	function setupVideoListener()
	{
		const tcpServer = net.createServer((socket) => {
			console.info('Video streamer created');
			socket.on('end', () => {
				console.info('Video streamer disconnected');
			})

			headers = [];

			const NALSplitter = new Split(NALSeparator);

			NALSplitter.on('data', (data) => {
				if (wsServer && wsServer.clients.length > 0) {

					// XXX: Why does this work? Should we not get these headers when the camera starts up?
					if (headers.length < 3) {
						headers.push(data);
					}

					broadcast(data);
				}

				if(conf.get("mayrecord")) {
					recordBuffer.write(NALSeparator);
					recordBuffer.write(data);
				}

				// For funky behaviour -- disable this to ONLY record the past (what's in buffer)
				if(recording) {
					ffmpegProc.stdin.write(NALSeparator);
					ffmpegProc.stdin.write(data);
				}

			}).on('error', (e) => {
				logger.error('splitter error %s', e);
				process.exit(0);
			});

			socket.pipe(NALSplitter);
		});

		tcpServer.listen(conf.get('tcpport'));

		if (conf.get('tcpport') == 'systemd') {
			logger.info('Video TCP server listening on systemd socket');
		} else {
			var address = tcpServer.address();
			if (address) {
				logger.info(`Video TCP server listening on ${address.address}:${address.port}`);
			}
		}
	}




	function setupVideoSender()
	{
		//wsServer = new WSServer({ port: conf.get('wsport') })
		wsServer = new WebSocket.WebSocketServer({ port: conf.get('wsport') });
		logger.info( "Video sender websocket server listening on %d", conf.get('wsport') );

		wsServer.on('connection', (ws) => {
			if (wsServer.clients.length >= conf.get('limit')) {
				logger.info('Video client rejected, limit reached');
				ws.close();
				return;
			}

			logger.info('Video client connected, watching %d', wsServer.clients.length)

			for (let i in headers) {
				ws.send(headers[i]);
			}

			ws.on('close', (ws, id) => {
				logger.debug('Video client disconnected, watching %d', wsServer.clients.length);
			})
		});
	}


	function setupMotionSender()
	{
		motionWsServer = new WebSocket.WebSocketServer({ port: conf.get('motionwsport') });
		logger.info( "Motion sender websocket server listening on %d", conf.get('motionwsport') );

		motionWsServer.on('connection', (ws) => {
			if (motionWsServer.clients.length >= conf.get('limit')) {
				logger.info('Motion client rejected, limit reached');
				ws.close();
				return;
			}

			logger.info('Motion client connected, watching %d', motionWsServer.clients.length)

			for (let i in headers) {
				ws.send(JSON.stringify( {
					message : "Welcome",
					settings : conf.get(),
					neighbours : neighbours
				}), -1, false);
			}

			ws.on('message', (msg) => {
				handleControlCommand(msg);
			});

			ws.on('close', (ws, id) => {
				logger.debug('Video client disconnected, watching %d', motionWsServer.clients.length);
			})
		});
	}


	function handleControlCommand(msg)
	{
		let parsed = JSON.parse(msg);

		logger.debug("Incoming control msg %s", parsed);
		switch(parsed.verb) {
			case "start" :
				startRecording();
				break;
			case "stop" :
				stopRecording();
				break;
			default :
				logger.error("Unknown verb %s", parsed.verb);
				break;
		}
	}


	function broadcastMessage(ob)
	{
		let str = JSON.stringify(ob);
		broadcastOverlay(str, str.length, false);
	}


	function previewShot(fileName)
	{
		logger.info(`Taking screenshot of video as %s.jpg`, fileName);

		let tmpFfmpeg = cp.spawn('/usr/bin/ffmpeg', [
			'-y',
			'-hide_banner',
			'-i', '../client/clips/' + fileName + '.h264',
			'-frames:v', '1',
			'-f', 'image2',
			`../client/clips/${fileName}.jpg`
		]);

		tmpFfmpeg.on('close', function(code) {
		    logger.debug('Screenshot done, code: %d', code);
			broadcastMessage(
				{
					"event" : "screenshot",
					"filename" : fileName + ".jpg",
				}
			);
		});
	}


	function startRecording()
	{
		let fileName = Date.now();

		logger.info("Starting recording to clips/%s...", fileName);

		ffmpegProc = cp.spawn('/usr/bin/ffmpeg', [
			'-hide_banner',
			'-y',

			// https://ffmpeg.org/ffmpeg-formats.html
			'-analyzeduration', '2M',		// It defaults to 5,000,000 microseconds = 5 seconds. 
			'-probesize', '5M',
			'-framerate', conf.get("framerate"),
			'-f', 'h264',
			'-i', '-',
			'-codec', 'copy',
			`../client/clips/${fileName}.h264`
		]);

		broadcastMessage(
			{
				"event" : "startRecording",
				"filename" : fileName + ".h264",
			}
		);

		ffmpegProc.stdout.setEncoding('utf8');
		ffmpegProc.stdout.on('data', function(data) {
			logger.debug('Recorder stdout %s', data);
		});

		ffmpegProc.stderr.setEncoding('utf8');
		ffmpegProc.stderr.on('data', function(data) {
			logger.debug('Recorder stderr %s', data);
		});

		ffmpegProc.on('close', function(code) {
			logger.debug('Recorder closing, code: %d', code);
			broadcastMessage(
				{
					"event" : "stopRecording",
					"filename" : fileName + ".h264",
				}
			);

			previewShot(fileName);
		});


		// XXX:
		// This has the chance of sending duplicate data as we will
		// have it in the recordBuffer for a while too. How bad is 
		// that? The whole passing arbitrary data to ffmpeg is not 
		// working great anyway -- so wth, seeing it as prototype
		// for now.
		for (let i in headers) {
			logger.debug("Send header to recorder %o", headers[i]);
			ffmpegProc.stdin.write(NALSeparator);
			ffmpegProc.stdin.write(headers[i]);
		}

		// Pass buffer of recorded data of the past in first...
		let buff = recordBuffer.read(conf.get("rbuffersize"));
		logger.debug(`Passing %d bytes to ffmpeg...`, buff.length);

		ffmpegProc.stdin.write(buff);

		logger.debug("Done passing buffer...");

		recording = true;
	}

	function stopRecording()
	{
		logger.info("Stopping recording...");
		recording = false;
		ffmpegProc.stdin.end();
	}

	function setupMotionProcessor()
	{
		mvrProcessor = new MvrProcessor(conf.get("framerate"), conf.get("width"), conf.get("height"));
	}

	function setupCameraDiscovery()
	{
		neighbours = [];

		// Delay the start of this a bit...
		setTimeout( () => {
			cameraDiscoverer = new CameraDiscovery(
				(ob) => {
					logger.info("Added neighbour");
					logger.debug("Neighbour's object: %o", ob);
					broadcastMessage(
						{
							"event" : "addNeighbour",
							"data" : ob
						}
					);
					neighbours.push(ob);
				},
				(ob) => {
					logger.info("Removed neighbour");
					logger.debug("Neighbour's object: %o", ob);
					// TODO: Remove from array
					broadcastMessage(
						{
							"event" : "removeNeighbour",
							"data" : ob
						}
					);
				}
			);
		}, 5000);
	}

	function setupProcess()
	{
		process.on('SIGINT', () => {
			logger.debug("Got SIGINT");

			if(ffmpegProc) {
				logger.debug("Stopping any recording...");
				ffmpegProc.stdin.end();
			}

			process.exit();
		});

		process.on('SIGTERM', () => {
			logger.debug("Got SIGTERM");

			if(ffmpegProc) {
				ffmpegProc.stdin.end();
			}
		});

	}

	console.log("=== New run ===", Date(), "MintyMint logging level", logger.level);

	setupProcess();

	if (conf.get('queryport')) {
		setupWebServer();
	}

	if(conf.get("mayrecord")) {
		setupRecorder();
	}

	if (conf.get('tcpport')) {
		setupVideoListener();
	}
	
	if (conf.get('motionport')) {
		setupMotionProcessor();
		setupMotionListener();
	}

	if (conf.get('wsport')) {
		setupVideoSender();
	}

	if (conf.get('motionwsport')) {
		setupMotionSender();
	}

	startCamera();

	if(conf.get("discovery")) {
		setupCameraDiscovery();
	}

