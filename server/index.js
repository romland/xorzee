"use strict";

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
const settingsFile = settingsDir + "/mintymint.config";

// Settings that require a restart of camera
const cameraSettings = [
	"videoport", "motionport", "bitrate", "framerate", "width", "height",
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
			event : "init",
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
		//
		// Let a config file override defaults...
		//
		conf.file( { file: settingsFile, format: require('hjson') });

		//
		// Command line arguments / options
		//
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

			// Video settings
			// NOTE: If new settings are added to camera, make sure
			//       they are also flagged as 'requires restart' in
			//       'reconfigure' (a const called 'cameraSettings').
			bitrate			: 1700000,								// Bitrate of video stream
			framerate		: 24,									// 30 FPS seems to be a bit high for single core - let's go for Hollywood standard!
			width			: 1920,									// Video stream width (the higher resolution, the more exact motion tracking)
			height			: 1080,									// Video stream height
			startupIgnore	: 600,									// How long we should ignore data from camera after starting up (ms)
			streamOverlay : {
				enabled         : true,								// Enable overlay
				showName        : true,								// Show name of camera
				// Time
				// %Y = year, %m = month, %d = day of month,
				// %Z = timezone name, %z = timezone offset, %p = AM/PM,
				// %X = current time with seconds (hh:mm:ss)
				// see also: https://man7.org/linux/man-pages/man3/strftime.3.html
				text            : "\n %Y-%m-%d %X",					// Misc text, can contain a few \n and date/time substitutions
				fontSize        : 16,								// font-size
				textLuminance   : "auto",							// null/auto = auto, otherwise a value between 0 and 255
				justify         : 2,								// 0=center, 1=left, 2=right
				top             : 990,								// pixels from the top
				left            : 0,								// pixels from the left
				backgroundColor : "68dce9"							// 'transparent' or rgb (e.g. ff00ff)
			},

			// Video streaming settings
			streamVideo		: false,								// Toggle streaming of video (can be changed runtime)
			onlyActivity	: true,									// Stream only _video_ when there is 'valid' activity (experimental!)
																	// You will want to set 'minActiveBlocks' to 20 or so, depending on i
																	// lighting conditions (there's always some noise).

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
				// This array is populated automatically with all
				// files in the conf/available-signals/*.conf.
				// The code doing this is below this blob of config
				// options.
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

			// Discovery settings
			servicename		: "MintyMint",							// You want to have this the same on ALL your devices (unless you want to group them)
			discovery		: true,									// Whether to discover neighbouring cameras (TODO: Rename to 'discover')
			announce		: true,									// Whther to announce presence to neighbouring cameras

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

			// Depending on implementation client-side, we are either using
			// current clusters or _historical_ clusters. It's recommended
			// to not send over both as JSON serialization gets pretty costly.
			// In the future I may actually have to resort to some binary
			// output of the MvrProcessor so that more data can be passed
			// over the wire.
			sendClusters			: true,							// These are clusters that happened _now_
			sendHistory				: false,						// These are clusters that happened now _and_ clusters that are deemed important

			// Performance output/tests
			//
			// also - https://nodejs.org/en/docs/guides/simple-profiling/ :
			// $ node --prof index.js
			// $ node --prof-process isolate-nnn > processed.txt
			outputMotionCost		: 0,							// Output motion performance averages every N frames (0 = disabled)
			motionCostThreshold		: 30,

		});

		conf.use('memory');

		//
		// Read in all enabled signals
		//
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


	// TODO: Refactor away
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
