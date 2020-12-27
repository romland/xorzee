"use strict";
const fs = require("fs");
const path = require("path");
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
		this.recordBuffer = new BinaryRingBuffer(conf.get("recordbuffersize"));
		this.recording = false;
		this.ffmpegProc = null;
		this.recordingToId = null;
		this.recordingMeta = null;

		this.notifyCb = notifyCb;
		this.lastNofication = null;
		this.recordLen = 0;

		this.latestRecordings = this._getLatestRecordings(conf.get("recordhistory"));
	}


	getLatestRecordings()
	{
		logger.debug("Queried latest recordings. Have %d", this.latestRecordings);
		return this.latestRecordings;
	}


	/**
	 * Get N latest recordings on disk.
	 *
	 * Note: Costly. Preferably this is only called on startup. Subsequent
	 *       recordings are added without reading them from disk/
	 */
	_getLatestRecordings(num = 20)
	{
		let allFiles = this._getSortedDir(this.conf.get("recordpath"), ".json");
		let lastFiles = allFiles.slice(Math.max(allFiles.length - num, 0))

		let ret = [];
		for(let i = 0; i < lastFiles.length; i++) {
			ret.push(
				JSON.parse(
					fs.readFileSync(this.conf.get("recordpath") + "/" + lastFiles[i], "utf8")
				)
			);
		}

		logger.debug("_getLatestRecordings() returned: %d entries", ret.length);
		return ret;
	}


	_getSortedDir(dir, ext)
	{
		let files = fs.readdirSync(dir);

		files = files.filter((file) => {
			return path.extname(file).toLowerCase() === ext;
		})
		.map( (fileName) => {
			return {
				name: fileName,
				time: fs.statSync(dir + '/' + fileName).mtime.getTime()
			};
		})
		.sort( (a, b) => {
			return a.time - b.time;
		})
		.map( (v) => {
			return v.name;
		});

		return files;
	}



	buffer(data)
	{
		this.recordBuffer.write(NALSeparator);
		this.recordBuffer.write(data);
	}


	/**
	 * Update the latestRecordings array
	 * (note: Others may sit with pointers to it, treat it well)
	 */
	_addRecording(meta)
	{
		if(this.latestRecordings.length > this.conf.get("recordhistory")) {
			// remove first
			this.latestRecordings.shift();
		}

		this.latestRecordings.push(meta);
	}


	stop()
	{
		logger.info("Stopping recording...");
		this.recording = false;

		if(this.ffmpegProc) {
			this.ffmpegProc.stdin.end();

			this.recordingMeta["stopped"] = Date.now();
			this.recordingMeta["size"] = this.recordLen;
			fs.writeFileSync(
				this.conf.get("recordpath") + "/" + this.recordingToId + ".json",
				JSON.stringify(this.recordingMeta)
			);
			logger.debug("Wrote recording meta %o", this.recordingMeta);

			this._addRecording(this.recordingMeta);

			// Screenshotter might want it.
			return this.recordingToId;
		}

		this.recordingMeta = null;
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
		if(this.recording) {
			logger.error("Already recording...");
			return null;
		}

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
        let buff = this.recordBuffer.read(this.conf.get("recordbuffersize"));
        logger.debug(`Passing %d bytes to ffmpeg...`, buff.length);

        this.ffmpegProc.stdin.write(buff);
		this.recordLen += buff.length;

        logger.debug("Done passing buffer...");

        this.recording = true;

		this.lastNotification = Date.now();

		this.recordingMeta = {
			camera : this.conf.get("name"),
			started : this.lastNotification,
			screenshot : this.recordingToId + ".jpg",
			video : this.recordingToId + ".h264",
			width : this.conf.get("width"),
			height : this.conf.get("height"),
			framerate : this.conf.get("framerate"),
			bitrate : this.conf.get("bitrate")
		};

		return this.recordingToId;
	}
}

exports.default = Recorder;

