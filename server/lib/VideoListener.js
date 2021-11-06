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

class VideoListener
{
	constructor(conf, videoSender, recorderNotifyCb = null)
	{
		this.headers = [];
		this.conf = conf;
		this.videoSender = videoSender;
		this.recorder = this.setupRecorder(recorderNotifyCb);
	}


	getHeaders()
	{
		return this.headers;
	}


	setupRecorder(recorderNotifyCb)
	{
		if(this.conf.get("mayRecord")) {
			return new Recorder(this.conf, recorderNotifyCb);
		}

		return null;
	}


	getRecorder()
	{
		return this.recorder;
	}


	start()
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

