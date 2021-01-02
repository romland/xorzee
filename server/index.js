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

const motsig = require("./lib/MotionSignaller");
const MotionSignaller = motsig.default;
const Signals = motsig.Signals;
const StandardSignals = motsig.StandardSignals;

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const settingsFile = path.resolve("../conf/mintymint.config");

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
		conf.file( { file: settingsFile, format: require('hjson') });

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
			onlyActivity	: true,									// Stream only _video_ when there is 'valid' activity (experimental!)
																	// You will want to set 'minActiveBlocks' to 20 or so, depending on i
																	// lighting conditions (there's always some noise).

			// Discovery settings
			servicename		: "MintyMint",							// You want to have this the same on ALL your devices (unless you want to group them)
			discovery		: true,									// Whether to discover neighbouring cameras (TODO: Rename to 'discover')
			announce		: true,									// Whther to announce presence to neighbouring cameras

			// Video settings
			bitrate			: 1700000,								// Bitrate of video stream
			framerate		: 24,									// 30 FPS seems to be a bit high for single core - let's go for Hollywood standard!
			width			: 1920,									// Video stream width (the higher resolution, the more exact motion tracking)
			height			: 1080,									// Video stream height
			startupIgnore	: 600,									// How long we should ignore data from camera after starting up (ms)

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
				minActiveBlocks		: 20,							// Total number of 'blocks'/vectors that need to be in play
				minInterval			: 5000,							// Do not start recording again if we stopped a previous one less than this ago
			},

			stopRecordRequirements : {
				stillTime			: 3000,							// How long things must be 'still' before we can stop recording
				maxFrameMagnitude	: 0,							// A frame is deemed 'active' if it has a total magnitude of this
				maxRecordTime		: 60000,						// Max length to record (+ what is buffered). Default is one minute.
				minRecordTime		: 0,							// Min length reo record (- what is buffered)
			},

			// Used to trigger external programs, such as sound
			// a bell, fetch a remote API or send a text.
			signals : [
				{
					name			: "Some SES email",				// A name that identifies the signal
					enabled			: false,						// Toggle signal on or off
					log				: true,							// Whether to log script's std-out/err
					onEvent			: Signals.START_RECORDING,		// When to run signal
					minInterval		: 30000,						// Minimum time that needs to pass before triggering signal again
					maxInstances	: 1,							// How many instances of this signal can run simultaneously
					maxErrors		: 0,							// How many times it is allowed to crash before it is ignored
					maxRunTime		: 5000,							// Signal cannot run for longer than this
					cwd				: null,							// Current working directory when executing external script
					execute			: StandardSignals.EMAIL_SES,	// Execute a shell command/script or the constant of a default signal
					args			: {								// Arguments to pass to the signal being executed (see docs elsewhere)
						subject	: "Camera activity",
						from	: null,
						to		: null,
					}
				},
				{
					name			: "Some email",					// A name that identifies the signal
					enabled			: false,						// Toggle signal on or off
					log				: true,							// Whether to log script's std-out/err
					onEvent			: Signals.START_RECORDING,		// When to run signal
					minInterval		: 30000,						// Minimum time that needs to pass before triggering signal again
					maxInstances	: 1,							// How many instances of this signal can run simultaneously
					maxErrors		: 0,							// How many times it is allowed to crash before it is ignored
					maxRunTime		: 5000,							// Signal cannot run for longer than this
					cwd				: null,							// Current working directory when executing external script
					execute			: StandardSignals.EMAIL,		// Execute a shell command/script or the constant of a default signal
					args			: {								// Arguments to pass to the signal being executed (see docs elsewhere)
						subject	: "Camera activity",
						from	: null,
						to		: null,
					}
				},
				{
					name			: "Some sound",					// A name that identifies the signal
					enabled			: false,						// Toggle signal on or off
					log				: true,							// Whether to log script's std-out/err
					onEvent			: Signals.START_RECORDING,		// When to run signal
					minInterval		: 10000,						// Minimum time that needs to pass before triggering signal again
					maxInstances	: 1,							// How many instances of this signal can run simultaneously
					maxErrors		: 0,							// How many times it is allowed to crash before it is ignored
					maxRunTime		: 5000,							// Signal cannot run for longer than this
					cwd				: path.resolve("../scripts/signals"),	// Current working directory when executing external script
					execute			: StandardSignals.SOUND,		// Execute a shell command/script or the constant of a default signal
					args			: path.resolve("../scripts/signals/media/doorbell.wav"),			// Comma separated arguments to pass to the signal being executed (see docs elsewhere)
				},
				{
					name			: "Some fetch",					// A name that identifies the signal
					enabled			: false,						// Toggle signal on or off
					log				: true,							// Whether to log script's std-out/err
					onEvent			: Signals.START_RECORDING,		// When to run signal
					minInterval		: 10000,						// Minimum time that needs to pass before triggering signal again
					maxInstances	: 1,							// How many instances of this signal can run simultaneously
					maxErrors		: 0,							// How many times it is allowed to crash before it is ignored
					maxRunTime		: 5000,							// Signal cannot run for longer than this
					cwd				: path.resolve("../scripts/signals"),	// Current working directory when executing external script
					execute			: StandardSignals.FETCH,		// Execute a shell command/script or the constant of a default signal
					args			: "http://localhost:8080",	// Comma separated arguments to pass to the signal being executed (see docs elsewhere)
				},
				{
					name			: "Some script",				// A name that identifies the signal
					enabled			: false,							// Toggle signal on or off
					log				: true,							// Whether to log script's std-out/err
					onEvent			: Signals.START_RECORDING,		// When to run signal
					minInterval		: 10000,						// Minimum time that needs to pass before triggering signal again
					maxInstances	: 1,							// How many instances of this signal can run simultaneously
					maxErrors		: 0,							// How many times it is allowed to crash before it is ignored
					maxRunTime		: 5000,							// Signal cannot run for longer than this
					cwd				: path.resolve("../scripts/signals"),	// Current working directory when executing external script
					execute			: "./echo.sh",					// Execute a shell command/script or the constant of a default signal
					args			: "http://localhost:8080/test",	// Comma separated arguments to pass to the signal being executed (see docs elsewhere)
				}
			],

			//
			// These settings is for if you are using the signal
			// StandardSignals.EMAIL_SES.
			//
			// For further doc see: https://github.com/aheckmann/node-ses
			//
			sendMailSES : {
				"key"		: null,		// your AWS SES key. Defaults to checking `process.env.AWS_ACCESS_KEY_ID` and `process.env.AWS_ACCESS_KEY`
				"secret"	: null,		// your AWS SES secret. Defaults to `process.env.AWS_SECRET_ACCESS_KEY` and `process.env.AWS_SECRET_KEY`
				"amazon"	: null,		// [optional] the amazon end-point uri. defaults to `https://email.us-east-1.amazonaws.com`
			},

			//
			// Mail settings (only needed if you are using the
			// standard signal email. The options specified are
			// fed right into https://github.com/guileen/node-sendmail
			// as-is. So, everything possible there, is possible.
			//
			// This is not really recommended as your home IP is 
			// probably blocked by big email providers (like gmail,
			// etc). Set up this to use an external mailserver or
			// simply use the 'sendMailSES' standard signal instead.
			//
			sendMail : {
				logger: {
					debug: logger.debug,
					info: logger.info,
					warn: logger.warn,
					error: logger.error
				},
				silent: false,
				smtpPort: 25,
			},

			//
			// Advanced/debug/test settings
			//

			// Cluster definition
			clusterEpsilon			: 2,							// The max distance (manhattan) to include points in a cluster (DBscan)
			clusterMinPoints		: 4,							// The min number of points to be classified as a cluster (DBscan)
			clusterDistancing		: 'Manhattan',					// MANHATTAN or EUCLIDEAN
			preFilterLoners			: false,						// Whether to filter out loners before density scan to (_possibly_) make clustering cheaper

			// Historical clusters
			discardInactiveAfter	: 2000,							// If a cluster was still for longer than this, discard it

			// Individual vectors
			vectorMinMagnitude 		: 2,							// Minimum magnitude of a vector to be deemed moving
			sendRaw					: false,						// Whether to pass raw vectors to client (debug -- enable RENDER_RAW on client too)

			// Performance output/tests
			outputMotionCost		: 0,							// Output motion performance averages every N frames (0 = disabled)
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
					logger.info("handleMotionEvent(): %s, %s", module, eventType);

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
					logger.info("handleMotionEvent(): %s, %s", module, eventType);

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
