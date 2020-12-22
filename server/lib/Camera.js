"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const cp = require('child_process');

class Camera
{
	constructor(conf)
	{
		this.conf = conf;
	}

	start()
	{
        var camProc = cp.spawn('/bin/sh', [
            '-c',
            `/usr/bin/raspivid ` +
            (logger.level === "debug" ? `--verbose ` : "") +
            // it seems decoder gets some issues with this... cannot reproduce 100% of the time, tho.
            // A low g value will make every frame appear like it's a motion-flash (and is thus ignored).
//          `-g 1` +        // A low value here will make ffmpeg pick up the video quicker -- drawbacks other than bandwidth?
            `--inline ` +
            `--spstimings ` +
            `--hflip ` +
            `--vflip ` +
            `--nopreview ` +
            `--width ${this.conf.get("width")} ` +
            `--height ${this.conf.get("height")} ` +
            `--timeout 0 ` +
            `--framerate ${this.conf.get("framerate")} ` +
            `--bitrate ${this.conf.get("bitrate")} ` +
            `--profile baseline ` +
            `--vectors tcp://127.0.0.1:${this.conf.get("motionport")} ` +
            `--output - | /bin/nc localhost ${this.conf.get("tcpport")}`
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
}

exports.default = Camera;

