/**
 * Video listener listens to camera for data (video stream).
 * 
 * The only thing this does to the stream is split messages
 * up into NAL units. That is, when they reach broadcast,
 * it is one unit.
 */
"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const NALSeparator = Buffer.from([0, 0, 0, 1]);
const net = require('net');
const Split = require('stream-split');
const Recorder = require("./Recorder").default;

const HEADERCOUNT = 20;		// 15 is not enough for firefox

class VideoListener
{
	constructor(conf, videoSender, recorderNotifyCb = null)
	{
		this.headers = [];
		this.conf = conf;
		this.videoSender = videoSender;
		this.recorder = this.setupRecorder(recorderNotifyCb);

		if(this.conf.get("serverSideMuxing") === true) {
			this.serverSideMuxing = true;
		} else {
			this.serverSideMuxing = false;
		}
	}


	getHeaders()
	{
		if(this.serverSideMuxing) {
			return this.videoSender.headers;
		} else {
			return this.headers;
		}
	}


	setupRecorder(recorderNotifyCb)
	{
		return new Recorder(this.conf, recorderNotifyCb);
	}


	getRecorder()
	{
		return this.recorder;
	}

	start()
	{
		if(this.serverSideMuxing) {
			this.startServerMuxing();
		} else {
			this.startClientMuxing();
		}
	}

	/**
	 * TODO / notes:
	 * - how well does serverside muxing work on an old raspberry pi zero?
	 * 		* guess is: Not great.
	 * - record-data will be mp4 and not H264 -- how does that propagate?
	 * 		* client needs changing when it comes to playing saved clips
	 * - use this.headers for the 'startBuffer'
	 *   ADD each 'chunk' as-is ('headers' is an array -- no need to buffer copy)
	 * - changing serverSideMuxing requires restart of server (too much hassle if we are currently 
	 *   recording and telling streams to reconnect)
	 */
	startServerMuxing()
	{
		const { Readable, Transform } = require('stream');
		const JMuxer = require('jmuxer');

		const jmuxer = new JMuxer({
			mode: 'video',
			fps: 30,
			debug: false
		});
		
		const mp4Reader = new Readable(
				{
					objectMode: true,
					read(size) {
					}
				}
		);

		this.videoSender.setHeaders([]);

		const tcpServer = net.createServer((socket) => {
            logger.debug('Video streamer connected');
            socket.on('end', () => {
                logger.debug('Video streamer disconnected');
            })

			socket.on('data', (data) => {
				mp4Reader.push({
					video: data
				});
			}).on('error', (e) => {
				logger.error('VideoListener error %s', e);
				process.exit(0);
			});
		});

        const jmuxStream = jmuxer.createStream();
        const streamTransformer = new Transform( { objectMode : true, } );
        streamTransformer._transform = (data, encoding, done) => {

			if(this.videoSender.headers.length < HEADERCOUNT) {
				// this.headers.push(data);
				this.videoSender.addHeader(data);
				done(null, null);
				return;
			}

			if(this.videoSender.getClientCount() > 0) {
				this.videoSender.broadcast(data);
			}

			if(this.conf.get("mayRecord")) {
				this.recorder.buffer(data);
			}

			if(this.recorder.isRecording()) {
				this.recorder.append(data);
			}

			done(null, null);
		};

		mp4Reader.pipe(jmuxStream).pipe(streamTransformer);

		tcpServer.listen(this.conf.get('videoPort'));

		let address = tcpServer.address();
		if(address) {
			logger.debug(`Video TCP server listening on ${address.address}:${address.port}`);
		}
	}

	startServerMuxing_OLD()
	{
		const { Readable } = require('stream');		
		const JMuxer = require('jmuxer');
		const jmuxer = new JMuxer({
			mode: 'video',
			fps: this.conf.get("frameRate"),
			debug: true
		});
		const mp4Reader = new Readable({
			objectMode: true,
			read(size) {
			}
		});

        const tcpServer = net.createServer((socket) => {
            logger.debug('Video streamer connected');
            socket.on('end', () => {
                logger.debug('Video streamer disconnected');
            })

			socket.on('data', (data) => {
				// if (this.headers.length < 3) {
				// 	this.headers.push(data);
				// }

                mp4Reader.push({
					video: data
				});

				if(this.conf.get("mayRecord")) {
					this.recorder.buffer(data);
				}

				if(this.recorder.isRecording()) {
					this.recorder.append(data);
				}
			}).on('error', (e) => {
				logger.error('splitter error %s', e);
				process.exit(0);
			});

			mp4Reader.pipe(jmuxer.createStream()).on("data", (data) => {
				if(this.videoSender.getClientCount() > 0) {
					this.videoSender.broadcast(data);
				}
			});

		});

		tcpServer.listen(this.conf.get('videoPort'));

		// this.videoSender.setHeaders(this.headers);

		let address = tcpServer.address();
		if(address) {
			logger.debug(`Video TCP server listening on ${address.address}:${address.port}`);
		}
	}


	startClientMuxing()
	{
        const tcpServer = net.createServer((socket) => {
            logger.debug('Video streamer connected');
            socket.on('end', () => {
                logger.debug('Video streamer disconnected');
            })

            const NALSplitter = new Split(NALSeparator);

            NALSplitter.on('data', (data) => {

				if (this.headers.length < 3) {
					this.headers.push(data);
				}

				if(this.videoSender.getClientCount() > 0) {
					this.videoSender.broadcast(data);
				}

				if(this.conf.get("mayRecord")) {
					this.recorder.buffer(data);
				}

				if(this.recorder.isRecording()) {
					this.recorder.append(data);
				}

			}).on('error', (e) => {
				logger.error('splitter error %s', e);
				process.exit(0);
			});

			socket.pipe(NALSplitter);
		});

		tcpServer.listen(this.conf.get('videoPort'));

		this.videoSender.setHeaders(this.headers);

		let address = tcpServer.address();
		if(address) {
			logger.debug(`Video TCP server listening on ${address.address}:${address.port}`);
		}
	}
}

exports.default = VideoListener;

