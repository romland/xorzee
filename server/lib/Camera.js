"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const cp = require('child_process');
const kill = require('tree-kill');


class Camera
{
	constructor(conf)
	{
		this.conf = conf;
		this.camProc = null;
	}

	start(altConf)
	{
		let c;

		if(altConf) {
			c = altConf;
		} else {
			c = this.conf;
		}

        let camArgs = `/usr/bin/raspivid ` +
            (logger.level === "debug" ? `--verbose ` : "") +
            // it seems decoder gets some issues with this... cannot reproduce 100% of the time, tho.
            // A low g value will make every frame appear like it's a motion-flash (and is thus ignored).
//          `-g 1` +        // A low value here will make ffmpeg pick up the video quicker -- drawbacks other than bandwidth?
            `--inline ` +
            `--spstimings ` +
            `--hflip ` +
            `--vflip ` +
            `--nopreview ` +
            `--width ${c.get("width")} ` +
            `--height ${c.get("height")} ` +
            `--timeout 0 ` +
            `--framerate ${c.get("framerate")} ` +
            `--bitrate ${c.get("bitrate")} ` +
            `--profile baseline ` +
            `--vectors tcp://127.0.0.1:${this.conf.get("motionport")} ` +
            `--output - | /bin/nc localhost ${this.conf.get("videoport")}`;

		logger.debug("Camera args %s", camArgs);

        this.camProc = cp.spawn('/bin/sh', [
            '-c',
			camArgs
        ]);

        this.camProc.stdout.setEncoding('utf8');
        this.camProc.stdout.on('data', function(data) {
            logger.debug('Cam-stdout: %s', data);
        });

        this.camProc.stderr.setEncoding('utf8');
        this.camProc.stderr.on('data', function(data) {
            logger.debug('Cam-stderr: %s', data);
        });

        this.camProc.on('close', function(code) {
            logger.debug('Cam-close code: %s', code);
        });

		logger.debug("Started camera with PID %d", this.camProc.pid);
	}

	async stop()
	{
		logger.debug("Stopping camera...");

		this.camProc.stdin.pause();
		logger.debug("Killing camera PID %d", this.camProc.pid);
//		this.camProc.kill();
		await kill(this.camProc.pid);
		this.camProc = null;

		logger.info("Stopped camera");
	}

	async restart(width, height, framerate, bitrate)
	{
		logger.debug("Restarting camera...");

		let m = new Map();

		m.set("width", width || this.conf.get("width"));
		m.set("height", height || this.conf.get("height"));
		m.set("framerate", framerate || this.conf.get("framerate"));
		m.set("bitrate", bitrate || this.conf.get("bitrate"));

		await this.stop();

		setTimeout(() => {
			this.start(m);
			logger.info("Restarted camera");
		}, 200);
	}

}

exports.default = Camera;

