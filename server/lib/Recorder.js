"use strict";
const os = require("os");
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
		this.recordBuffer = new BinaryRingBuffer(conf.get("recordBufferSize"));
		this.recording = false;
		this.ffmpegProc = null;
		this.recordingToId = null;
		this.recordingMeta = null;

		this.notifyCb = notifyCb;
		this.lastNofication = null;
		this.recordLen = 0;

		this.simulateRecord = conf.get("simulateRecord");
		this.manuallyRecording = false;

		this.latestRecordings = this._getLatestRecordings(conf.get("recordHistory"));

		this.serverSideMuxing = this.conf.get("serverSideMuxing");
		if(this.serverSideMuxing) {
			this.recordToStream = null;
		}


		this.subscriptions = {
			"start" : [],
			"stop" : []
		};
	}


	getLatestRecordings()
	{
		logger.debug("Queried latest recordings. Have %d", this.latestRecordings.length);
		return this.latestRecordings;
	}

	subscribeEvent(eventType, fn)
	{
		logger.debug("Adding recorder event subscriber for %s", eventType);
		this.subscriptions[eventType].push(fn);
	}

	broadcastEvent(eventType, data)
	{
		logger.debug("Broadcasting recorder event %s", eventType);
		for(let i = 0; i < this.subscriptions[eventType].length; i++) {
			this.subscriptions[eventType][i](data);
		}
	}


	/**
	 * Get N latest recordings on disk.
	 *
	 * Note: Costly. Preferably this is only called on startup. Subsequent
	 *       recordings are added without reading them from disk/
	 */
	_getLatestRecordings(num = 20)
	{
		let allFiles = this._getSortedDir(this.conf.get("recordPath"), ".json");
		let lastFiles = allFiles.slice(Math.max(allFiles.length - num, 0))

		let ret = [];
		for(let i = 0; i < lastFiles.length; i++) {
			ret.push(
				JSON.parse(
					fs.readFileSync(this.conf.get("recordPath") + "/" + lastFiles[i], "utf8")
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
		if(!this.serverSideMuxing) {
			this.recordBuffer.write(NALSeparator);
		}
		this.recordBuffer.write(data);
	}


	/**
	 * Update the latestRecordings array
	 * (note: Others may sit with pointers to it, treat it well)
	 */
	_addRecording(meta)
	{
		if(meta.dryRun === true) {
			return;
		}
		
		if(this.latestRecordings.length > this.conf.get("recordHistory")) {
			// remove first
			this.latestRecordings.shift();
		}

		this.latestRecordings.push(meta);
	}

	stop()
	{
		if(!this.recording) {
			logger.info("Not recording.");
			return;
		}

		this.recording = false;

		if(this.dryRun() === false) {
			if(this.serverSideMuxing) {
				this.recordToStream.end();
			} else {
				if(this.ffmpegProc) {
					this.ffmpegProc.stdin.end();
				} else {
					this.lastNotification = null;
					this.recordLen = 0;
					return null;
				}
			}
		}

		this.recordingMeta["stopped"] = Date.now();
		this.recordingMeta["dryRun"] = this.dryRun();

		logger.info((this.dryRun() ? "[SIMULATED] " : "") + "Stopping recording (after %d sec)...", (this.recordingMeta["stopped"] - this.recordingMeta["started"]) / 1000);

		this.recordingMeta["size"] = this.recordLen;
		if(this.dryRun() === false) {
			fs.writeFileSync(
				this.conf.get("recordPath") + "/" + this.recordingToId + ".json",
				JSON.stringify(this.recordingMeta)
			);
			logger.debug("Wrote recording meta %o", this.recordingMeta);
		}

		this._addRecording(this.recordingMeta);

		this.manuallyRecording = false;

		this.broadcastEvent("stop");

		// Screenshotter might want it.
		return this.recordingToId;
	}


	getRecordingMeta()
	{
		return this.recordingMeta;
	}

	append(data)
	{
		if(this.dryRun() === false) {
			if(this.serverSideMuxing) {
				this.recordToStream.write(data);
			} else {
				this.ffmpegProc.stdin.write(NALSeparator);
				this.ffmpegProc.stdin.write(data);
			}
		}

		if(this.serverSideMuxing) {
			this.recordLen += NALSeparator.length + data.length;
		} else {
			this.recordLen += data.length;
		}

		if((this.lastNotification + 10000) < Date.now()) {
			this.notifyCb(this.recordingToId, this.recordLen);
			this.lastNotification = Date.now();
		}
	}


	dryRun()
	{
		if(this.manuallyRecording) {
			return false;
		}

		return this.simulateRecord;
	}


	isRecording()
	{
		return this.recording;
	}


	isManuallyRecording()
	{
		return this.manuallyRecording;
	}


	shutdown()
	{
		logger.debug("Shutdown - stopping any recording...");
		this.stop();
	}


	start(headers, manualOverride = false)
	{
		if(this.recording) {
			if(manualOverride && !this.manuallyRecording && this.simulateRecord) {
				// if it's dry-run, quickly just stop it if it's running, and continue...
				this.stop();
			} else {
				logger.error("Already recording...");
				return null;
			}
		}

		if(!headers) {
			throw new Error("Start require headers");
		}

		this.broadcastEvent("start");

		if(manualOverride === true) {
			this.manuallyRecording = true;
		} else {
			this.manuallyRecording = false;
		}

		this.recordingToId = Date.now();

        logger.info((this.dryRun() ? "[SIMULATED] " : "") + "Starting recording to %s/%s.h264 ...", this.conf.get("recordPath"), this.recordingToId);

		if(this.dryRun() === false) {
			if(this.serverSideMuxing) {
				this.recordToStream = fs.createWriteStream(this.recordingToId + ".mp4", { flags : "a" });

				// TODO: Do I need to wait for on("open" ...?
				//   https://stackoverflow.com/questions/12906694/fs-createwritestream-does-not-immediately-create-file
				this.recordToStream.on("open", () => {
					logger.debug("RECORD STREAM OPEN -- TODO: DO I GET A RACE TO APPENDING HEADERS BELOW?");
				});

				this.recordToStream.on("error", (err) => {
					throw "FAILED TO WRITE RECORDING. TODO: Handle this more gracefully";
				});

				for (let i in headers) {
					logger.debug("Pass header to recording %o", headers[i]);
					this.recordToStream.write(headers[i]);
				}

				const buff = this.recordBuffer.read(this.conf.get("recordBufferSize"));
				logger.debug(`Passing %d bytes to recording...`, buff.length);
				this.recordToStream.write(buff);

				logger.debug("Done passing headers/buffer to recording...");

			} else {
				this.ffmpegProc = cp.spawn('/usr/bin/ffmpeg', [
					'-hide_banner',
					'-y',

					// https://ffmpeg.org/ffmpeg-formats.html
					'-analyzeduration', '2M',       // It defaults to 5,000,000 microseconds = 5 seconds.
					'-probesize', '5M',
					'-framerate', this.conf.get("frameRate"),
					'-f', 'h264',
					'-i', '-',
					'-codec', 'copy',
					`${this.conf.get("recordPath")}/${this.recordingToId}.h264`
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
				let buff = this.recordBuffer.read(this.conf.get("recordBufferSize"));
				logger.debug(`Passing %d bytes to ffmpeg...`, buff.length);

				this.ffmpegProc.stdin.write(buff);
				this.recordLen += buff.length;

				logger.debug("Done passing buffer...");
			}
		} else {
			// Properly calculate recordLen even though we are simulating
			for (let i in headers) {
				if(this.serverSideMuxing) {
					this.recordLen += headers[i].length;
				} else {
					this.recordLen += NALSeparator.length + headers[i].length;
				}
			}
		}

        this.recording = true;

		this.lastNotification = Date.now();

		this.recordingMeta = {
			host		: os.hostname(),
			camera		: this.conf.get("name"),
			started		: this.lastNotification,
			screenshot	: this.recordingToId + ".png",
			video		: this.recordingToId + (this.serverSideMuxing ? ".mp4" : ".h264"),
			width		: this.conf.get("width"),
			height		: this.conf.get("height"),
			framerate	: this.conf.get("frameRate"),
			bitrate		: this.conf.get("bitRate")
		};

		return this.recordingToId;
	}
}

exports.default = Recorder;

