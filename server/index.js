"use strict";

const path = require("path");
const conf = require('nconf');
const Util = require("./lib/util");
const Camera = require("./lib/Camera").default;
const WebServer = require("./lib/WebServer").default;
const VideoSender = require("./lib/VideoSender").default;
const VideoListener = require("./lib/VideoListener").default;
const MotionSender = require("./lib/MotionSender").default;
const MotionListener = require("./lib/MotionListener").default;
const ServiceAnnouncer = require("./lib/ServiceAnnouncer").default;
const ServiceDiscoverer = require("./lib/ServiceDiscoverer").default;
const VideoScreenshotter = require("./lib/VideoScreenshotter").default;

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const settingsFile = path.resolve("../mintymint.config");

	var camera;
	var webServer;
	var videoSender;
	var videoListener;
	var motionSender;
	var motionListener;
	var serviceAnnouncer;
	var serviceDiscoverer;
	var videoScreenshotter;

	var neighbours;


	/**
	 * Entry point
	 */
	function main()
	{
		configure();

		console.log("=== New run ===", Date(), `MintyMint @ "${conf.get("name")}". Logging level`, logger.level);

		initProcess();

		// Misc
		videoScreenshotter = new VideoScreenshotter(conf);

		if(conf.get('wwwport')) {
			webServer = new WebServer(conf);
			webServer.start();
		}

		// Discovery and announcement
		if(conf.get("discovery")) {
			serviceDiscoverer = setupServiceDiscoverer();
		}

		if(conf.get("announce")) {
			serviceAnnouncer = new ServiceAnnouncer(conf);
			serviceAnnouncer.start();
		}

		// Video
		if(conf.get('videowsport')) {
			videoSender = new VideoSender(conf);
			videoSender.start();
		}

		if(conf.get('videoport')) {
			videoListener = new VideoListener(conf, videoSender, recordProgressNotification);
			videoListener.start();
		}
	
		// Motion
		if(conf.get('motionwsport')) {
			motionSender = new MotionSender(conf);
			motionSender.start(
				getWelcomeMessage,
				handleControlCommand
			);
		}

		if(conf.get('motionport')) {
			motionListener = new MotionListener(conf, motionSender, videoListener, handleMotionEvent);
			motionListener.start();
		}

		// Camera
		camera = new Camera(conf);
		camera.start();
	}


	function getWelcomeMessage()
	{
		return {
			message : "Welcome",
			settings : conf.get(),
			neighbours : neighbours,
			lastRecordings : videoListener.getRecorder().getLatestRecordings()
		};
	}


	/**
	 * Read in configuration file and if not defined, set sane defaults.
	 */
	function configure()
	{
		/**
		 * Let a config file override defaults...
		 */
		conf.file( { file: settingsFile });

		/**
		 * Command line arguments / options
		 */
		conf.argv().defaults({
			// General
			name			: "Camera at default location",			// A name of your choice identifying this camera
			password		: "",									// TODO: be able to password protect stream (need to pass pw on connect)

			// Internal ports
			videoport		: 8000,									// (internal) for camera (video)
			motionport		: 8001,									// (internal) for camera (motion data)

			// Webserver
			wwwport			: 8080,									// (public) for client (web content)
			publicpath		: path.resolve("../client/public/"),	// The _public_ directory accessible by clients

			// Public ports and limitations
			videowsport		: 8081,									// (public) for client (stream)
			motionwsport	: 8082,									// (public) for client (motion stream)
			wsclientlimit	: 100,									// max number clients allowed

			// Discovery settings
			servicename		: "MintyMint",							// You want to have this the same on ALL your devices (unless you want to group them)
			discovery		: true,									// Whether to discover neighbouring cameras (TODO: Rename to 'discover')
			announce		: true,									// Whther to announce presence to neighbouring cameras

			// Video settings
			bitrate			: 1700000,								// Bitrate of video stream
			framerate		: 24,									// 30 FPS seems to be a bit high for single core
//framerate		: 2,									// 30 FPS seems to be a bit high for single core
			width			: 1920,									// Video stream width (the higher resolution, the more exact motion tracking)
			height			: 1080,									// Video stream height

			// Ignore
			ignoreArea		: [],									// If setting manually, remember resolution should be 1920x1088.
																	// Format, a convex hulled polygon [ { x: ?, y: ? }, ... ] (i.e. array of objects with x/y pairs)

			// Recording settings
			mayrecord		: true,									// If true, will allocate a buffer of the past
			recordbuffersize: (3 * 1024 * 1024),					// How much to video (in bytes) to buffer for pre-recording
			recordpath		: path.resolve("../client/public/clips/"),// Where to store recordings
			recordpathwww	: "/clips/",							// Where a web-client can find clips/etc
			recordhistory	: 20,									// Number of latest clips to report to clients

			trackReasons	: true,									// Whether to track why start/stop recording did not trigger on a frame
			simulateRecord	: true,									// If true, run only MotionRuleEngine, do not trigger Recorder (i.e. nothing written to disk)

			startRecordRequirements : {
				activeTime			: 2000,							// Time that needs to be active to trigger recording
				minFrameMagnitude	: 0,							// Total magnitude to be beaten to start recording
				minActiveBlocks		: 0,							// Total number of 'blocks'/vectors that need to be in play
				minInterval			: 5000,							// Do not start recording again if we stopped a previous one less than this ago
			},

			stopRecordRequirements : {
				stillTime			: 3000,							// How long things must be 'still' before we can stop recording
				maxFrameMagnitude	: 0,							// A frame is deemed 'active' if it has a total magnitude of this
				maxRecordTime		: 60000,						// Max length to record (+ what is buffered). Default is one minute.
				minRecordTime		: 0,							// Min length reo record (- what is buffered)
			},

			// TODO: Used to trigger external programs (such as sound a bell or send a text)
			signalRequirements : {
				// uses startRecordRequirements to trigger
				sendDefaultSignals	: true,							// Send whatever built-in signals (configurable elsewhere)
				runAfterEvent		: false,						// Run when recording stops, not when it starts
				minInterval			: 10000,						// Minimum time that needs to pass before triggering signal again
				executeScript		: null,							// Execute a shell script
			},

			//
			// Advanced settings
			//

			// Cluster definition
			clusterEpsilon			: 2,							// The max distance (manhattan) to include points in a cluster (DBscan)
			clusterMinPoints		: 4,							// The min number of points to be classified as a cluster (DBscan)

			// Historical clusters
			discardInactiveAfter	: 2000,							// If a cluster was still for longer than this, discard it

			// Individual vectors
			vectorMinMagnitude 		: 2,							// Minimum magnitude of a vector to be deemed moving
			sendRaw					: false,						// Whether to pass raw vectors to client (debug -- enable RENDER_RAW on client too)
		});


		conf.use('memory');
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
	}


	function handleMotionEvent(module, eventType, eventData, simulation = false)
	{
		logger.info("handleMotionEvent(): %s, %s", module, eventType);

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
					motionSender.broadcastMessage(
						{
							"event" : "startRecordingMotion",
							"filename" : meta.video,
							"meta" : meta
						}
					);
					break;

				case "stop" :
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


	function handleGeneralCommands(cmd, data)
	{
		let fn;

		switch(cmd) {
			case "reconfigure" :
				logger.info("Resizing stream...");

				motionListener.stopSending();

				for(let s in data) {
					logger.info("Changing setting %s to %s", s, data[s]);
					conf.set(s, data[s]);
				}

				motionListener.reconfigure(conf.get("width"), conf.get("height"));

				fn = camera.restart(conf);

				motionSender.broadcastMessage(
					{
						"event" : "resize",
						"data" : "todo-give-new-values",
						"settings" : conf.get()
					}
				);
				logger.info("Resized stream...");

				motionListener.resumeSending();
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


	// TODO: Refactor away
	function setupServiceDiscoverer()
	{
		neighbours = [];

		let onAdd = (ob) => {
			logger.info("Added neighbour");
			logger.debug("Neighbour's object: %o", ob);

			motionSender.broadcastMessage(
				{
					"event" : "addNeighbour",
					"data" : ob
				}
			);

			neighbours.push(ob);
		};

		let onRemove = (ob) => {
			logger.info("Removed neighbour");
			logger.debug("Neighbour's object: %o", ob);

			// TODO: Remove from array
			motionSender.broadcastMessage(
				{
					"event" : "removeNeighbour",
					"data" : ob
				}
			);
		}

		return new ServiceDiscoverer( conf, onAdd, onRemove );
	}

main();
