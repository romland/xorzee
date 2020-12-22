"use strict";

const pino = require('pino');
const cp = require('child_process');
const conf = require('nconf');
const path = require("path");

// new Classes
const CameraDiscovery = require("./lib/CameraDiscovery").default;
const Camera = require("./lib/Camera").default;
const WebServer = require("./lib/WebServer").default;
const VideoSender = require("./lib/VideoSender").default;
const VideoListener = require("./lib/VideoListener").default;
const MotionSender = require("./lib/MotionSender").default;
const MotionListener = require("./lib/MotionListener").default;
const VideoScreenshotter = require("./lib/VideoScreenshotter").default;

	const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

	var neighbours;

	// --- new class instances ---
	var camera;
	var webServer;
	var videoSender;
	var motionSender;
	var cameraDiscoverer;
	var motionListener;
	var videoListener;
	var videoScreenshotter;



	conf.argv().defaults({
		// === General ===
		name		: "Camera at default location",

		// === Internal ports ===
		tcpport		: 8000,					// (internal) for camera
		motionport	: 8001,					// (internal) for camera (motion data)

		// === Webserver ===
		queryport	: 8080,					// (public) for client (web content)
		publicpath	: path.resolve("../client/"),

		// === Public ports and limitations ===
		limit		: 150,					// max number clients allowed
		wsport		: 8081,					// (public) for client (stream)
		motionwsport: 8082,					// (public) for client (motion stream)

		// === Video settings ===
		bitrate		: 1700000,				// Bitrate of video stream
		framerate	: 24,
		width		: 1920,
		height		: 1080,
//		width: 1280, height: 722,
//		width: 640, height: 482,			// Warning, the height CAN NOT be divisible by 16! (bit of a bug!)

		// === Recording settings ===
		mayrecord	: true,					// If true, will allocate a buffer of the past
		rbuffersize	: (3 * 1024 * 1024),	// How much to video (in bytes) to buffer for pre-recording
		recordpath	: path.resolve("../client/clips/"),

		// === Discovery settings ===
		discovery	: true,					// Whether to discover neighbouring cameras
	});


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
				break;

			default :
				logger.error("Unknown verb %s", parsed.verb);
				break;
		}
	}


	function setupCameraDiscoverer()
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

		return new CameraDiscovery( conf, onAdd, onRemove );
	}


	function setupApp()
	{
		process.on('SIGINT', () => {
			logger.debug("Got SIGINT");

			if(videoListener.getRecorder()) {
				videoListener.getRecorder().shutdown();
			}

			process.exit();
		});

		process.on('SIGTERM', () => {
			logger.debug("Got SIGTERM");

			if(videoListener.getRecorder()) {
				videoListener.getRecorder().shutdown();
			}
		});

	}

	console.log("=== New run ===", Date(), "MintyMint logging level", logger.level);

	setupApp();

	// Misc
	if(conf.get("discovery")) {
		cameraDiscoverer = setupCameraDiscoverer();
	}

	videoScreenshotter = new VideoScreenshotter(conf);

	if (conf.get('queryport')) {
		webServer = new WebServer(conf);
		webServer.start();
	}

	// Video
	if (conf.get('wsport')) {
		videoSender = new VideoSender(conf);
		videoSender.start();
	}

	if (conf.get('tcpport')) {
		videoListener = new VideoListener(conf, videoSender);
		videoListener.start();
	}
	
	// Motion
	if (conf.get('motionwsport')) {
		motionSender = new MotionSender(conf);
		motionSender.start(
			{
                message : "Welcome",
                settings : conf.get(),
                neighbours : neighbours
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

