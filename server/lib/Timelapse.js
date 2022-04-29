"use strict";
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const Util = require('./util');
const fs = require("fs");
const path = require("path");

/**
 * Most of the cruft in here is to prevent time-drift between application 
 * restarts and reconfigures.
 */
/*
	{
		enabled : true,
		intervalSeconds : 60,
		fileNamePrefix : "sensor-timelapse"
	}
	"-YYYY-MM-DD-HH-MM-SS"
*/
class Timelapse
{
	constructor(conf, videoScreenshotter)
	{
		this.conf = conf;
		this.videoScreenshotter = videoScreenshotter;

		this.enabled = false;
		this.firstTS = null;
		this.nextTS = null;
		this.numSnapshots = 0;
		this.persistedTimestampPath = path.resolve("../conf") + "/last-timelapse.timestamp";
		this.timelapsePath = this.conf.get("recordPath") + "/timelapse/";
	}


	start()
	{
		const tl = this.conf.get("timelapse");
		const intervalSec = tl.intervalSeconds;

		if(!tl || tl.enabledTimelapse !== true || !intervalSec || isNaN(intervalSec) === true) {
			logger.debug("No timelapse active...");
			this.enabled = false;
			return;
		}

		if(!fs.existsSync(this.timelapsePath)){
			fs.mkdirSync(this.timelapsePath, { recursive: true });
			logger.debug("Created directory for timelapses: %s", this.timelapsePath);
		}

		const intervalMs = intervalSec * 1000;
		this.numSnapshots = 0;
		this.firstTS = null;

		if(fs.existsSync(this.persistedTimestampPath)) {
			let tmp = fs.readFileSync(this.persistedTimestampPath, "utf-8");
			logger.debug("Loaded last timelapse timestamp: %s", new Date(parseInt(tmp, 10)));

			if(parseInt(tmp, 10)) {
				this.firstTS = parseInt(tmp, 10);

				const now = Date.now();

				// If loaded timestamp is more than one interval in the past,
				// adjust it. The complexity of this is to avoid time-drift.
				while((this.firstTS + (this.numSnapshots * intervalMs)) < (now-intervalMs)) {
					this.numSnapshots++;
				}
				logger.info("Timelapse missed %d snapshots", this.numSnapshots);

			} else {
				this.firstTS = null;
			}
		}

		if(this.firstTS === null) {
			logger.info("No stored last timelapse timestamp, using 'now'");
			this.firstTS = Date.now() - intervalMs;
		}

		logger.info("Timelapse enabled at %d second interval", intervalSec);

		if(tl.overrideIntervalOnStartup !== true) {
			this.numSnapshots++;
		} else {
			// Take a snapshot immediately on start-up, disregarding interval
		}

		this.nextTS = this.firstTS + (this.numSnapshots * intervalMs);
		this.enabled = true;
	}


	tick()
	{
		if(!this.enabled || !this.nextTS) {
			return;
		}

		this.run();
	}

	run()
	{
		if(Date.now() < this.nextTS) {
			return;
		}

		const tl = this.conf.get("timelapse");

		const dt = new Date();
		const suffix = "-" + dt.getFullYear()
			+ "-" + this.pad(dt.getMonth() + 1)
			+ "-" + this.pad(dt.getDate())
			+ "-" + this.pad(dt.getHours())
			+ "-" + this.pad(dt.getMinutes())
			+ "-" + this.pad(dt.getSeconds());

		// Do the thing!
		this.videoScreenshotter.snapshotDispmanx(tl.fileNamePrefix + suffix + ".png", this.timelapsePath);

		fs.writeFile(this.persistedTimestampPath, this.nextTS, {}, (err) => {
			if(err) {
				logger.error("Failed to write timelapse timestamp -- this is not good. Full disk or insufficient permissions?");
			}
		});

		this.numSnapshots++;
		this.nextTS = this.firstTS + (this.numSnapshots * (tl.intervalSeconds*1000));
	}

	stop()
	{
		this.enabled = false;
	}

	reconfigure(conf)
	{
		logger.info("Reconfiguring timelapse...");
		this.stop();

		this.conf = conf;

		this.start();
	}

	pad(num)
	{
		var norm = Math.floor(Math.abs(num));
		return (norm < 10 ? '0' : '') + norm;
	};
	
}

exports.default = Timelapse;
