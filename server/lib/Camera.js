"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const cp = require('child_process');
const kill = require('tree-kill');
const Util = require('./util');


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

		let so = c.get("streamOverlay");

		// https://www.raspberrypi.org/documentation/raspbian/applications/camera.md
		let annotation = "";
		if(so && so.enabled) {


			// Not sure if this does what I think. I _think_ 
			// setting 1024 bit says 'use background color'.
			// Documentation claims 'set to black'. I think
			// documentation is wrong.
			if(so.backgroundColor !== "transparent") {
				annotation += `--annotate ${1024 + 12} `;
			} else {
				// needed for time-substitutions
				annotation += "--annotate 12 ";
			}

			if(so.showName || so.text.length > 0) {
				annotation += '--annotate " ';
				if(so.showName) {
					annotation += c.get("name");
				}

				if(so.text.length > 0) {
					annotation += " " + so.text;
				}

				annotation += ' " ';
			}

			let bg = Util.arrToHexStr(Util.rgbToVuy(so.backgroundColor));
			let bright = Util.isBright(so.backgroundColor);
			let fg;

			if(!so.textLuminance || so.textLuminance === "auto" || typeof so.textLuminance !== "number" ) {
				fg = (bright ? "0x00" : "0xFF");
				logger.debug("Auto text luminance to %s", fg);
			} else {
				fg = Util.arrToHexStr( [ so.textLuminance ] );
				logger.debug("Manual text luminance to %s", fg);
			}

			logger.debug("Background %s (YUV %s) is %s (%s), lum: %d. Foreground set to %s",
				so.backgroundColor,
				bg,
				(bright ? "bright" : "dark"),
				bright,
				Util.getLuminance(so.backgroundColor),
				fg
			);

			annotation += "--annotateex "
				+ `${so.fontSize || 32},`
				+ `${fg},`
				+ `${bg},`
				+ `${so.justify},`
				+ `${so.left},`
				+ `${so.top}`;

			annotation += " ";
		}

        let camArgs = `/usr/bin/raspivid ` +
            (logger.level === "debug" ? `--verbose ` : "") +
			// it seems decoder gets some issues with this... cannot reproduce 100% of the time, tho.
			// A low g value will make every frame appear like it's a motion-flash (and is thus ignored).
			//`-g 1` +        // A low value here will make ffmpeg pick up the video quicker -- drawbacks other than bandwidth?
			`--inline ` +
			`--spstimings ` +
			`--hflip ` +
			`--vflip ` +
			// With preview, I can use dispmanx to take screenshots of live stream
//			`--nopreview ` +
			annotation +
			`--width ${c.get("width")} ` +
			`--height ${c.get("height")} ` +
			`--timeout 0 ` +
			`--framerate ${c.get("frameRate")} ` +
			`--bitrate ${c.get("bitRate")} ` +
			`--profile baseline ` +
			`--vectors tcp://127.0.0.1:${this.conf.get("motionPort")} ` +
			`--output - | /bin/nc localhost ${this.conf.get("videoPort")}`;

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
            logger.warn('Camera closed: %s', code);
        });

		logger.debug("Started camera with PID %d", this.camProc.pid);

		if(!this.camProc.pid) {
			logger.warn("Could probably not start camera; something already using it?");
		}
	}

	async stop()
	{
		logger.debug("Stopping camera...");

		this.camProc.stdin.pause();
		logger.debug("Killing camera PID %d", this.camProc.pid);

		await kill(this.camProc.pid);
		this.camProc = null;

		logger.info("Stopped camera");
	}

	async restart(c)
	{
		logger.debug("Restarting camera...");

		await this.stop();

		setTimeout(() => {
			this.start(c);
			logger.info("Restarted camera");
		}, 200);
	}

}

exports.default = Camera;

