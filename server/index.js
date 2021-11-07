"use strict";

const Configuration = require("./lib/Configuration.js").default;
const fs = require("fs");
const path = require("path");
const conf = require('nconf');
const Util = require("./lib/util");
const Hjson = require('hjson');
const Camera = require("./lib/Camera").default;
const WebServer = require("./lib/WebServer").default;
const VideoSender = require("./lib/VideoSender").default;
const VideoListener = require("./lib/VideoListener").default;
const MotionSender = require("./lib/MotionSender").default;
const MotionListener = require("./lib/MotionListener").default;
const ServiceAnnouncer = require("./lib/ServiceAnnouncer").default;
const ServiceDiscoverer = require("./lib/ServiceDiscoverer").default;
const VideoScreenshotter = require("./lib/VideoScreenshotter").default;

const motsig = require("./lib/MotionSignaller");
const MotionSignaller = motsig.default;
const Signals = motsig.Signals;
const StandardSignals = motsig.StandardSignals;

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const settingsDir = path.resolve("../conf");
const settingsFile = settingsDir + "/xorzee.config";

// Settings that require a restart of camera
const cameraSettings = [
	"videoPort", "motionPort", "bitRate", "frameRate", "width", "height",
	"streamOverlay",
];

	var camera;
	var webServer;
	var videoSender;
	var videoListener;
	var motionSender;
	var motionListener;
	var motionSignaller;
	var serviceAnnouncer;
	var serviceDiscoverer;
	var videoScreenshotter;

	var neighbours;


	/**
	 * Entry point
	 */
	function main()
	{
		logger.info("=== New run === %s. Logging level %s", new Date(), logger.level);
		configure();


		initProcess();

		// Misc
		videoScreenshotter = new VideoScreenshotter(conf);

		if(conf.get('wwwPort')) {
			webServer = new WebServer(conf);
			webServer.start();
		}

		// Discovery and announcement
		if(conf.get("discover")) {
			serviceDiscoverer = setupServiceDiscoverer();
		}

		if(conf.get("announce")) {
			serviceAnnouncer = new ServiceAnnouncer(conf);
			serviceAnnouncer.start();
		}

		// Video
		if(conf.get('videoWsPort')) {
			videoSender = new VideoSender(conf);
			videoSender.start();
		}

		if(conf.get('videoPort')) {
			videoListener = new VideoListener(conf, videoSender, recordProgressNotification);
			videoListener.start();
		}
	
		// Motion
		if(conf.get('motionWsPort')) {
			motionSender = new MotionSender(conf);
			motionSender.start(
				getWelcomeMessage,
				handleControlCommand
			);
		}

		if(conf.get('motionPort')) {
			motionListener = new MotionListener(conf, motionSender, videoListener, handleMotionEvent);
			motionListener.start();
		}

		motionSignaller = new MotionSignaller(conf, videoListener.getRecorder());
		motionSignaller.start();

		// Camera
		camera = new Camera(conf);
		camera.start();
	}


	function getWelcomeMessage()
	{
		return {
			message : "Welcome",
			event : "init",
			settings : conf.get(),
			settingsMeta : Configuration.getConfigurationMeta(),
			neighbours : neighbours,
			lastRecordings : videoListener.getRecorder().getLatestRecordings()
		};
	}


	/**
	 * Read in configuration file and if not defined, set sane defaults.
	 */
	function configure()
	{
		Configuration.verifyDocumentation();

		// Let a config file override defaults...
		conf.file( { file: settingsFile, format: Hjson });

		// Command line arguments / options
		conf.argv().defaults( Configuration.get() );

		conf.use('memory');

		// Read in all enabled signals
		loadEnabledSignals();

	}

	function loadEnabledSignals()
	{
		let files = fs.readdirSync(settingsDir + "/enabled-signals");

		files = files.filter((file) => {
			return path.extname(file).toLowerCase() === ".config";
		});

		// Load in external signals and place them in 'conf.signals'!
		let json, parsed;
		for(let i = 0; i < files.length; i++) {
			json = fs.readFileSync(settingsDir + "/enabled-signals/" + files[i], "utf8");
			parsed = Hjson.parse(json);

			// add their filename to collection so we know which file to change
			parsed._fileName_ = files[i];

			// need support for knowing when to path.resolve() (does not start with / ?)
			if(parsed.cwd && parsed.cwd.startsWith("/") === false) {
				parsed.cwd = path.resolve(parsed.cwd);
			}

			if(parsed.execute && parsed.execute.startsWith("/") === false) {
				parsed.execute = path.resolve(parsed.cwd + "/" + parsed.execute);
			}

			// Need support for string constants
			if(Signals[parsed.onEvent]) {
				parsed.onEvent = Signals[parsed.onEvent];
			} else {
				throw new Error("Unknown event in configuration: " + parsed.onEvent);
			}

			if(StandardSignals[parsed.execute]) {
				parsed.execute = StandardSignals[parsed.execute];
			}

			// Make sure any signals already in the 'signals' array is left intact (they can sit in the config-file)
			conf.get("signals").push(parsed);
			logger.info("Loaded enabled signal: %s", files[i]);
		}

		logger.debug("Loaded in enabled signals %o", conf.get("signals"));
	}


	/**
	 * Setup shutdown etc.
	 */
	function initProcess()
	{
		process.on('SIGINT', () => {
			logger.debug("Got SIGINT");
			exit();
			process.exit();
		});

		process.on('SIGTERM', () => {
			logger.debug("Got SIGTERM");
			exit();
		});

	}


	/**
	 * Called when we are exitting.
	 */
	function exit()
	{
		if(videoListener.getRecorder()) {
			videoListener.getRecorder().shutdown();
		}

		if(serviceAnnouncer) {
			serviceAnnouncer.stop();
		}

		if(motionSignaller) {
			motionSignaller.stop();
		}
	}


	function handleMotionEvent(module, eventType, eventData, simulation = false)
	{
		if(module === "MotionRuleEngine") {
			let meta;

			if(simulation) {
				//meta = videoListener.getRecorder().getRecordingMeta();
				meta = {
					"SIMULATION" : true,
					video : "fakevideo.h264"
				};

			} else {
				meta = videoListener.getRecorder().getRecordingMeta();
			}

			switch(eventType) {
				case "start" :
					logger.debug("handleMotionEvent(): %s, %s", module, eventType);

					motionSignaller.activity(Signals.START_RECORDING);

					motionSender.broadcastMessage(
						{
							"event" : "startRecordingMotion",
							"filename" : meta.video,
							"meta" : meta
						}
					);
					break;

				case "stop" :
					logger.debug("handleMotionEvent(): %s, %s", module, eventType);

					motionSignaller.activity(Signals.STOP_RECORDING);

					motionSender.broadcastMessage(
						{
							"event" : "stopRecordingMotion",
							"filename" : meta.video,
							"meta" : meta
						}
					);

					motionSender.broadcastMessage(
						{
							"event" : "lastRecordings",
							"data" : videoListener.getRecorder().getLatestRecordings()
						}
					);
					break;

				case "activity" :
					videoSender.setActive();
					motionSignaller.activity(Signals.ACTIVE_FRAME);
					break;

				default :
					break;
			}


		} else {
			logger.warn("handleMotionEvent(), event from unknown module %s %s", module, eventType);
		}
	}


	/**
	 * Command dispatcher for commands coming from clients.
	 */
	function handleControlCommand(msg)
	{
		let ret;

		let parsed = JSON.parse(msg);

		logger.debug("Incoming control msg %s", parsed);

		switch(parsed.scope) {
			case "general" :
				ret = handleGeneralCommands(parsed.verb, parsed.data);
				break;

			case "record" :
				ret = handleRecordCommands(parsed.verb, parsed.data);
				break;

			case "motion" :
				ret = handleMotionCommands(parsed.verb, parsed.data);
				break;

			default :
				logger.error("Unknown command scope %s", parsed.scope);
				break;
		}
	}


	function requiresCameraRestart(newSettings)
	{
		for(let i = 0; i < cameraSettings.length; i++) {
			if(newSettings[cameraSettings[i]]) {
				return true;
			}
		}

		return false;
	}


	function handleGeneralCommands(cmd, data)
	{
		let fn;

		switch(cmd) {
			case "reconfigure" :
				logger.info("Reconfiguring server...");

				let restartCamera = requiresCameraRestart(data);

				if(restartCamera) {
					logger.info("Reconfiguring requires camera restart");
					motionListener.stopSending();
				}

				for(let s in data) {
					logger.info("Changing setting %s to %s", s, data[s]);
					conf.set(s, data[s]);
				}

				if(restartCamera) {
					motionListener.reconfigure(conf.get("width"), conf.get("height"));
					fn = camera.restart(conf);
					motionListener.resumeSending();
				}

				motionSender.broadcastMessage(
					{
						"event" : "reconfigure",
						"data" : "is-in-settings",
						"settings" : conf.get()
					}
				);

				logger.debug("Reconfigured server...");
				break;

			default :
				logger.warn("Unknown general command %s", cmd);
				break;
		}
	}


	function handleRecordCommands(cmd, data)
	{
		let fn;

		switch(cmd) {
			case "start" :
				fn = videoListener.getRecorder().start(videoListener.getHeaders());
				motionSender.broadcastMessage(
					{
						"event" : "startRecording",
						"filename" : fn + ".h264",
					}
				);
				break;

			case "stop" :
				fn = videoListener.getRecorder().stop();
				motionSender.broadcastMessage(
					{
						"event" : "stopRecording",
						"filename" : fn + ".h264",
					}
				);

				videoScreenshotter.start(fn);
				motionSender.broadcastMessage(
					{
						"event" : "screenshot",
						"filename" : fn + ".jpg",
					}
				);

				motionSender.broadcastMessage(
					{
						"event" : "lastRecordings",
						"data" : videoListener.getRecorder().getLatestRecordings()
					}
				);
				break;
			default :
				logger.warn("Unknown record command %s", cmd);
				break;
		}
	}


	function handleMotionCommands(cmd, data)
	{
		switch(cmd) {
			case "ignore" :
				logger.info("Got ignore area %o", data);

				let scaledPolygon = Util.scalePolygon(
					data.points,
					data.resolution,
					{ width: 1920, height: 1088 }
				);

				logger.debug("Scaled polygon %o", scaledPolygon);

				conf.set("ignoreArea", scaledPolygon);
				motionListener.reconfigure();

				Util.savePartialSettings(settingsFile, { ignoreArea : scaledPolygon });

				motionSender.broadcastMessage(
					{
						"event" : "updatedIgnoreArea",
						"settings" : conf.get()
					}
				);
				break;

			default :
				logger.warn("Unknown motion command %s", cmd);
				break;
		}
	}


	/**
	 * Pass on recording progress to clients.
	 * Called through callback by Recorder.
	 */
	function recordProgressNotification(recordId, recordLen)
	{
		motionSender.broadcastMessage({
			"event" : "recordProgress",
			"data" : {
				"filename" : recordId,
				"length" : recordLen
			}
		});
	}


	// TODO: Refactor away to some better place
	function setupServiceDiscoverer()
	{
		neighbours = [];

		let onAdd = (ob) => {
			// Add neighbour
			if(neighbours.includes(ob.name)) {
				logger.info("We already knew about this neighbour: %s", ob.name)
				return;
			}

			neighbours.push(ob);

			logger.info("Added neighbour: %s", ob.name);

			motionSender.broadcastMessage(
				{
					"event" : "addNeighbour",
					"data" : ob,
					"neighbours" : neighbours
				}
			);
		};

		let onRemove = (ob) => {
			// Remove neighbour
			let len = neighbours.length;
			for(let i = len - 1; i >= 0; i--) {
				if(neighbours[i].name === ob.name) {
					logger.info("Removed neighbour: %s", ob.name);
					neighbours.splice(i, 1);
				}
			}

			motionSender.broadcastMessage(
				{
					"event" : "removeNeighbour",
					"data" : ob,
					"neighbours" : neighbours
				}
			);
		}

		return new ServiceDiscoverer( conf, onAdd, onRemove );
	}

main();
