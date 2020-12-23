"use strict";

const conf = require('nconf');
const path = require("path");
const pino = require('pino');
const Camera = require("./lib/Camera").default;
const WebServer = require("./lib/WebServer").default;
const VideoSender = require("./lib/VideoSender").default;
const VideoListener = require("./lib/VideoListener").default;
const MotionSender = require("./lib/MotionSender").default;
const MotionListener = require("./lib/MotionListener").default;
const ServiceDiscoverer = require("./lib/ServiceDiscoverer").default;
const VideoScreenshotter = require("./lib/VideoScreenshotter").default;
const ServiceAnnouncer = require("./lib/ServiceAnnouncer").default;
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

	var camera;
	var webServer;
	var videoSender;
	var motionSender;
	var serviceDiscoverer;
	var motionListener;
	var videoListener;
	var videoScreenshotter;
	var serviceAnnouncer;

	var neighbours;


	/**
	 * Let a config file override defaults...
	 */
	conf.file( { file: path.resolve("../mintymint.config") });


	/**
	 * Command line arguments / options
	 */
	conf.argv().defaults({
		// General
		name			: "Camera at default location",		// A name of your choice identifying this camera

		// Internal ports
		tcpport			: 8000,								// (internal) for camera
		motionport		: 8001,								// (internal) for camera (motion data)

		// Webserver
		queryport		: 8080,								// (public) for client (web content)
		publicpath		: path.resolve("../client/"),

		// Public ports and limitations
		limit			: 150,								// max number clients allowed
		wsport			: 8081,								// (public) for client (stream)
		motionwsport	: 8082,								// (public) for client (motion stream)

		// Discovery settings
		discovery		: true,								// Whether to discover neighbouring cameras (TODO: Rename to 'discover')
		announce		: true,
		servicename		: "MintyMint",						// You want to have this the same on ALL your devices (unless you want to group them)

		// Video settings
		bitrate			: 1700000,							// Bitrate of video stream
		framerate		: 24,								// 30 FPS seems to be a bit high for single core
		width			: 1920,
		height			: 1080,								// WARNING, the height CAN NOT be divisible by 16! (it's a bug!)

		// Recording settings
		mayrecord		: true,								// If true, will allocate a buffer of the past
		rbuffersize		: (3 * 1024 * 1024),				// How much to video (in bytes) to buffer for pre-recording
		recordpath		: path.resolve("../client/clips/"),	// Where to store recordings
		recordpathwww	: "/clips/",						// Where a web-client can find clips/etc
		recordhistory	: 20,								// Number of latest clips to report to clients

		// TODO: 
		// to use camelCase or not?
		recordrequirements : {
			minimumActiveTime	: 2000			// ms
			// ability to specify area
			// ability to specify min AND max density
		},

		// TODO: Used to trigger external programs (such as sound a bell or send a text)
		signalrequirements : {
			// use recordrequirements unless specified
		},
	});



	/**
	 * Entry point
	 */
	function main()
	{
		console.log("=== New run ===", Date(), `MintyMint @ "${conf.get("name")}". Logging level`, logger.level);

		initProcess();

		// Misc
		videoScreenshotter = new VideoScreenshotter(conf);

		if (conf.get('queryport')) {
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
		if (conf.get('wsport')) {
			videoSender = new VideoSender(conf);
			videoSender.start();
		}

		if (conf.get('tcpport')) {
			videoListener = new VideoListener(conf, videoSender, recordProgressNotification);
			videoListener.start();
		}
	
		// Motion
		if (conf.get('motionwsport')) {
			motionSender = new MotionSender(conf);
			motionSender.start(
				{
	                message : "Welcome",
	                settings : conf.get(),
	                neighbours : neighbours,
					lastRecordings : videoListener.getRecorder().getLatestRecordings()
				},
				handleControlCommand
			);
		}

		if (conf.get('motionport')) {
			motionListener = new MotionListener(conf, motionSender);
			motionListener.start();
		}

		// Camera
		camera = new Camera(conf);
		camera.start();
	}


	function exit()
	{
		if(videoListener.getRecorder()) {
			videoListener.getRecorder().shutdown();
		}

		if(serviceAnnouncer) {
			serviceAnnouncer.stop();
		}
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
	 * Command dispatcher for commands coming from clients.
	 */
	function handleControlCommand(msg)
	{
		let parsed = JSON.parse(msg);

		logger.debug("Incoming control msg %s", parsed);

		let fn;
		switch(parsed.verb) {
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
				logger.error("Unknown command %s", parsed.verb);
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

