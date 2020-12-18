"use strict";
/*
Run:

1. node index.js --udpport 8000 --wsport 8081
2. raspivid -ih -stm -hf -vf -n -v -w 1920 -t 0 -fps 24 -ih -b 1700000 -pf baseline -o - | nc localhost 8000
3. node node_modules/http-server/bin/http-server .

Go to http://raspi-ip:8080/


*/


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

const { BufferListStream } = require('bl');	// XXX: It's a bit silly to include this one, but it saved me a little time.

const mvrproc = require("./lib/mvrprocessor.js");
const MvrProcessor = mvrproc.default;
const MvrFilterFlags = mvrproc.MvrFilterFlags;


const SAVE_STREAM = false;

	var wsServer;
	var motionWsServer;

	var conf = require('nconf');
	var headers = [];

	conf.argv().defaults({
		tcpport		: 8000,		// for camera
		udpport		: 8000,		// for camera
		motionport	: 8001,		// for camera (motion data)

		queryport	: 8080,		// for client (content)
		wsport		: 8081,		// for client (stream)
		motionwsport: 8082,		// for client (motion stream)

		limit		: 150,		// max number clients allowed

		framerate	: 24,
//		framerate	: 4,
		width		: 1920,
		height		: 1080,
		bitrate		: 1700000,
	});

	var mvrProcessor = new MvrProcessor(conf.get("framerate"), conf.get("width"), conf.get("height"));


	var cameraStarted = false;

	function startCamera()
	{
		if(cameraStarted) {
			return;
		}

		cameraStarted = true;

		// raspivid -ih -stm -hf -vf -n -v -w 1920 -t 0 -fps 24 -ih -b 1700000 -pf baseline -o - | nc localhost 8000
		var camProc = cp.spawn('/bin/sh', [
			'-c',
			`/usr/bin/raspivid ` +
			// it seems decoder gets some issues with this... cannot reproduce 100% of the time, tho.
			// A low g value will make every frame appear like it's a motion-flash (and is thus ignored).
//			`-g 1` +		// A low value here will make ffmpeg pick up the video quicker -- drawbacks other than bandwidth?
			`-ih -stm -hf -vf -n -v ` +
			`-w ${conf.get("width")} ` +
			`-t 0 ` +
			`-fps ${conf.get("framerate")} ` +
			`-b ${conf.get("bitrate")} ` +
			`-pf baseline ` +
			`-x tcp://127.0.0.1:${conf.get("motionport")} ` +
			`-o -` +
			' | /bin/nc localhost ' + conf.get("tcpport")
		]);

		camProc.stdout.setEncoding('utf8');
		camProc.stdout.on('data', function(data) {
		    console.log('CAM stdout: ' + data);
		});

		camProc.stderr.setEncoding('utf8');
		camProc.stderr.on('data', function(data) {
		    console.log('CAM stderr: ' + data);
		});

		camProc.on('close', function(code) {
		    console.log('===> CAM closing code: ' + code);
		});

	}


	// sreenshot:
	// ffmpeg -y -hide_banner -i out.h264 -ss 0 -frames:v 1 out.jpg


	if(SAVE_STREAM) {
		// https://gist.github.com/steven2358/ba153c642fe2bb1e47485962df07c730
		// Extract a frame each second: ffmpeg -i input.mp4 -vf fps=1 thumb%04d.jpg -hide_banner

		// ffmpeg -v debug -y -analyzeduration 9M -probesize 9M -i pipe:0 -codec copy out.h264

		var proc = cp.spawn('/usr/bin/ffmpeg', [
			'-hide_banner',
			'-y',
			'-analyzeduration', '9M',
			'-probesize', '9M',
			'-framerate', conf.get("framerate"),
			'-i', '-',
			'-codec', 'copy',
			'../client/out.h264'
		]);

		proc.stdout.setEncoding('utf8');
		proc.stdout.on('data', function(data) {
		    console.log('FFMPEG stdout: ' + data);
		});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', function(data) {
		    console.log('FFMPEG stderr: ' + data);
		});

		proc.on('close', function(code) {
		    console.log('===> FFMPEG closing code: ' + code);
		});

		process.on('SIGINT', () => {
			// end saving of ffmpeg stream
			console.log("ending recording...");
			proc.stdin.end();
			process.exit();
		});

		process.on('SIGTERM', () => {
			proc.stdin.end();
		});

	}


	if (conf.get('queryport')) {
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
			console.log("Listening for HTTP requests on port", conf.get('queryport'));
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

	function broadcastOverlay(data, len)
	{
		motionWsServer.clients.forEach((ws) => {
			if (ws.readyState === 1) {
				ws.send(data, { binary: true });
			}
		});
	}

	if (conf.get('motionport')) {

		const tcpServer = net.createServer((socket) => {
			console.log('motion streamer connected');

			socket.on('end', () => {
				console.log('motion streamer disconnected');
			});

//			const NALSplitter = new Split(NALSeparator);

			let vectorLines = Math.floor( conf.get("height") / 16) + 1;
			let vectorsPerLine = Math.floor( conf.get("width") / 16) + 1;
			let frameLength = vectorsPerLine * vectorLines * 4;
			let bl = new BufferListStream();
			let frameData = null;


//			NALSplitter.on('data', (data) => {
			socket.on('data', (data) => {

				bl.append(data);

				while(true) {
					if(bl.length < frameLength) {
						break;
					}

					// Protect against eating too much damn memory if we are too slow.
					if(bl.length > frameLength * 5) {
						console.warn("Discarding motion frames, we are probably too slow.");
						bl.consume(frameLength);
						bl.consume(frameLength);
						bl.consume(frameLength);
						bl.consume(frameLength);
					}

//					console.clear();

					//frameData = bl.shallowSlice(0, frameLength);      // argh, this does not expose fill() -- oh well, a memory copy then :(
					frameData = bl.slice(0, frameLength);

					// Modifies frameData in place -- this seems to slow everything down...
//					console.time("processFrame");
					mvrProcessor.processFrame(frameData, frameLength);
//					console.timeEnd("processFrame");

					bl.consume(frameLength);

					broadcastOverlay(frameData, frameLength);

//					console.log("motion data:", frameLength);
//					mvrProcessor.outputFrameStats(frameData);


				}

			}).on('error', (e) => {
				console.log('motion splitter error ' + e);
				process.exit(0);
			})

//			socket.pipe(NALSplitter);
		});

		tcpServer.listen(conf.get('motionport'));

		if (conf.get('motionport') == 'systemd') {
			console.log('motion TCP server listening on systemd socket');
		} else {
			var address = tcpServer.address();
			if (address) {
				console.log(`motion TCP server listening on ${address.address}:${address.port}`);
			}
		}

	} else {
		console.log("Motion listener disabled");
	}

	if (conf.get('tcpport')) {
		const tcpServer = net.createServer((socket) => {
			console.log('streamer connected');
			socket.on('end', () => {
				console.log('streamer disconnected');
			})

			headers = [];

			const NALSplitter = new Split(NALSeparator);

			NALSplitter.on('data', (data) => {
				if (wsServer && wsServer.clients.length > 0) {
					if (headers.length < 3) {
						headers.push(data);
					}

					broadcast(data);
				}
			}).on('error', (e) => {
				console.log('splitter error ' + e);
				process.exit(0);
			});

			socket.pipe(NALSplitter);

			if(SAVE_STREAM) {
				socket.pipe(proc.stdin);
			}
		});

		tcpServer.listen(conf.get('tcpport'));

		if (conf.get('tcpport') == 'systemd') {
			console.log('TCP server listening on systemd socket');
		} else {
			var address = tcpServer.address();
			if (address) {
				console.log(`TCP server listening on ${address.address}:${address.port}`);
			}
		}

	}

	if (conf.get('udpport')) {
		const udpServer = dgram.createSocket('udp4');

		udpServer.on('listening', () => {
			var address = udpServer.address();
			console.log(
				`UDP server listening on ${address.address}:${address.port}`
			);
		});

		const NALSplitter = new Split(NALSeparator);

		NALSplitter.on('data', (data) => {
			if (wsServer && wsServer.clients.length > 0) {
				broadcast(data);
			}
		}).on('error', (e) => {
			console.log('splitter error ' + e);
			process.exit(0);
		})

		udpServer.on('message', (msg, rinfo) => {
			NALSplitter.write(msg);
		});

		udpServer.bind(conf.get('udpport'));

	}

	if (conf.get('wsport')) {
		//wsServer = new WSServer({ port: conf.get('wsport') })
		wsServer = new WebSocket.WebSocketServer({ port: conf.get('wsport') });
		console.log(
			`WS server listening on`, conf.get('wsport')
		);

		wsServer.on('connection', (ws) => {
			if (wsServer.clients.length >= conf.get('limit')) {
				console.log('client rejected, limit reached');
				ws.close();
				return;
			}

			console.log('client connected, watching ' + wsServer.clients.length)

			for (let i in headers) {
				ws.send(headers[i]);
			}

			ws.on('close', (ws, id) => {
				console.log('client disconnected, watching ' + wsServer.clients.length);
			})
		});
	}

	if (conf.get('motionwsport')) {
		motionWsServer = new WebSocket.WebSocketServer({ port: conf.get('motionwsport') });
		console.log(
			`motion WS server listening on`, conf.get('motionwsport')
		);

		motionWsServer.on('connection', (ws) => {
			if (motionWsServer.clients.length >= conf.get('limit')) {
				console.log('(motion) client rejected, limit reached');
				ws.close();
				return;
			}

			console.log('motion client connected, watching ' + motionWsServer.clients.length)

			for (let i in headers) {
//				ws.send(headers[i]);
				ws.send("Welcome, TODO");
			}

			ws.on('close', (ws, id) => {
				console.log('motion client disconnected, watching ' + motionWsServer.clients.length);
			})
		});
	}


	startCamera();
