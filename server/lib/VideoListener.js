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

// how to deal with headers, need them for recorder...

	}

	getHeaders()
	{
		return this.headers;
	}


	setupRecorder(recorderNotifyCb)
	{
		if(this.conf.get("mayrecord")) {
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
            logger.info('Video streamer connected');
            socket.on('end', () => {
                logger.info('Video streamer disconnected');
            })

            const NALSplitter = new Split(NALSeparator);

            NALSplitter.on('data', (data) => {
                if (this.videoSender.getClientCount() > 0) {
                    // XXX: Why does this work? Should we not get these headers when the camera starts up?
                    if (this.headers.length < 3) {
                        this.headers.push(data);
                    }

                    this.videoSender.broadcast(data);
                }

                if(this.conf.get("mayrecord")) {
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

        tcpServer.listen(this.conf.get('tcpport'));

		this.videoSender.setHeaders(this.headers);

        if (this.conf.get('tcpport') == 'systemd') {
            logger.info('Video TCP server listening on systemd socket');
        } else {
            var address = tcpServer.address();
            if (address) {
                logger.info(`Video TCP server listening on ${address.address}:${address.port}`);
            }
        }
	}
}

exports.default = VideoListener;

