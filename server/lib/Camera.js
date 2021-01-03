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


	// string or array rgb
	rgbToYuv(rgb)
	{
		if(typeof rgb === "string") {
			rgb = this.hexStrToArr(rgb);
		}

		return [
			0.257 * rgb[0] + 0.504 * rgb[1] + 0.098 * rgb[2] + 16,   // Y
			-0.148 * rgb[0] - 0.291 * rgb[1] + 0.439 * rgb[2] + 128, // U
			0.439 * rgb[0] - 0.368 * rgb[1] - 0.071 * rgb[2] + 128   // V
		];
	}

	// string or array rgb
	rgbToVuy(rgb)
	{
		if(typeof rgb === "string") {
			rgb = this.hexStrToArr(rgb);
		}

		return [
			0.439 * rgb[0] - 0.368 * rgb[1] - 0.071 * rgb[2] + 128,   // V
			-0.148 * rgb[0] - 0.291 * rgb[1] + 0.439 * rgb[2] + 128,  // U
			0.257 * rgb[0] + 0.504 * rgb[1] + 0.098 * rgb[2] + 16,    // Y
		];
	}

	arrToHexStr(arr)
	{
		return "0x" + Buffer.from(arr).toString("hex").toUpperCase();
	}

	// rgb str e.g.: ff00ff
	hexStrToArr(str)
	{
		if(str.length !== 6) {
			logger.error("Invalid hex str %s", str);
			return [0,0,0];
		}

		let arr = [];
		for(let c = 0; c < str.length; c += 2) {
			arr.push(
				parseInt(str.substr(c, 2), 16)
			);
		}

		return arr;
	}

	// string or array rgb
	isBright(rgb)
	{
		if(typeof rgb === "string") {
			rgb = this.hexStrToArr(rgb);
		}

		return this.getLuminance(rgb) > 125;
	}

	// string or array rgb
	getLuminance(rgb)
	{
		if(typeof rgb === "string") {
			rgb = this.hexStrToArr(rgb);
		}

		return Math.round(((parseInt(rgb[0]) * 299) +
			(parseInt(rgb[1]) * 587) +
			(parseInt(rgb[2]) * 114)) / 1000);
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

			let bg = this.arrToHexStr(this.rgbToVuy(so.backgroundColor));
			let bright = this.isBright(so.backgroundColor);
			let fg;

			if(!so.textLuminance || so.textLuminance === "auto" || typeof so.textLuminance !== "number" ) {
				fg = (bright ? "0x00" : "0xFF");
				logger.debug("Auto text luminance to %s", fg);
			} else {
				fg = this.arrToHexStr( [ so.textLuminance ] );
				logger.debug("Manual text luminance to %s", fg);
			}

			logger.debug("Background %s (YUV %s) is %s (%s), lum: %d. Foreground set to %s",
				so.backgroundColor,
				bg,
				(bright ? "bright" : "dark"),
				bright,
				this.getLuminance(so.backgroundColor),
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

	async restart(c)
	{
		logger.debug("Restarting camera...");
/*
		let m = new Map();

		m.set("width", width || this.conf.get("width"));
		m.set("height", height || this.conf.get("height"));
		m.set("framerate", framerate || this.conf.get("framerate"));
		m.set("bitrate", bitrate || this.conf.get("bitrate"));
*/
		await this.stop();

		setTimeout(() => {
			this.start(c);
			logger.info("Restarted camera");
		}, 200);
	}

}

exports.default = Camera;

