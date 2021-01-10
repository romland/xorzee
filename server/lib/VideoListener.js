/**
 * Video listener listens to camera for data (video stream).
 */
"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const systemd = require('systemd');
const NALSeparator = Buffer.from([0, 0, 0, 1]);
const net = require('net');
//const dgram = require('dgram');
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
				if(this.videoSender.getClientCount() > 0) {
					// XXX: Should we not get these headers when the camera starts up?
					if (this.headers.length < 3) {
						this.headers.push(data);
					}

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

        if (this.conf.get('videoPort') == 'systemd') {
            logger.debug('Video TCP server listening on systemd socket');
        } else {
            var address = tcpServer.address();
            if (address) {
                logger.debug(`Video TCP server listening on ${address.address}:${address.port}`);
            }
        }
	}
}

exports.default = VideoListener;

