"use strict";
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const BinaryRingBuffer = require('@cisl/binary-ring-buffer');
const cp = require('child_process');
const NALSeparator = Buffer.from([0, 0, 0, 1]);

class Recorder
{
	constructor(conf, notifyCb = null)
	{
		this.conf = conf;
		this.recordBuffer = new BinaryRingBuffer(conf.get("rbuffersize"));
		this.recording = false;
		this.ffmpegProc = null;
		this.recordingToId = null;

		this.notifyCb = notifyCb;
		this.lastNofication = null;
		this.recordLen = 0;
	}


	buffer(data)
	{
		this.recordBuffer.write(NALSeparator);
		this.recordBuffer.write(data);
	}


	stop()
	{
		logger.info("Stopping recording...");
		this.recording = false;

		if(this.ffmpegProc) {
			this.ffmpegProc.stdin.end();
			// Screenshotter might want it.
			return this.recordingToId;
		}

		this.lastNotification = null;
		this.recordLen = 0;
		return null;
	}


	append(data)
	{
		this.ffmpegProc.stdin.write(NALSeparator);
		this.ffmpegProc.stdin.write(data);
		this.recordLen += NALSeparator.length + data.length;

		if((this.lastNotification + 10000) < Date.now()) {
			this.notifyCb(this.recordingToId, this.recordLen);
			this.lastNotification = Date.now();
		}
	}


	isRecording()
	{
		return this.recording;
	}


	shutdown()
	{
		logger.debug("Shutdown - stopping any recording...");
		this.stop();
	}


	start(headers)
	{
		if(!headers) {
			throw new Error("Start require headers");
		}

		this.recordingToId = Date.now();

        logger.info("Starting recording to %s/%s.h264 ...", this.conf.get("recordpath"), this.recordingToId);

        this.ffmpegProc = cp.spawn('/usr/bin/ffmpeg', [
            '-hide_banner',
            '-y',

            // https://ffmpeg.org/ffmpeg-formats.html
            '-analyzeduration', '2M',       // It defaults to 5,000,000 microseconds = 5 seconds.
            '-probesize', '5M',
            '-framerate', this.conf.get("framerate"),
            '-f', 'h264',
            '-i', '-',
            '-codec', 'copy',
            `${this.conf.get("recordpath")}/${this.recordingToId}.h264`
        ]);

        this.ffmpegProc.stdout.setEncoding('utf8');
        this.ffmpegProc.stdout.on('data', function(data) {
            logger.debug('Recorder stdout %s', data);
        });

        this.ffmpegProc.stderr.setEncoding('utf8');
        this.ffmpegProc.stderr.on('data', function(data) {
            logger.debug('Recorder stderr %s', data);
        });

        this.ffmpegProc.on('close', function(code) {
            logger.debug('Recorder closing, code: %d', code);
        });


        // XXX:
        // This has the chance of sending duplicate data as we will
        // have it in the recordBuffer for a while too. How bad is
        // that? The whole passing arbitrary data to ffmpeg is not
        // working great anyway -- so wth, seeing it as prototype
        // for now.
        for (let i in headers) {
			logger.debug("Send header to recorder %o", headers[i]);
			this.ffmpegProc.stdin.write(NALSeparator);
			this.ffmpegProc.stdin.write(headers[i]);
			this.recordLen += NALSeparator.length + headers[i].length;
        }

        // Pass buffer of recorded data of the past in first...
        let buff = this.recordBuffer.read(this.conf.get("rbuffersize"));
        logger.debug(`Passing %d bytes to ffmpeg...`, buff.length);

        this.ffmpegProc.stdin.write(buff);
		this.recordLen += buff.length;

        logger.debug("Done passing buffer...");

        this.recording = true;

		this.lastNotification = Date.now();

		return this.recordingToId;
	}
}

exports.default = Recorder;

