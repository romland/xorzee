const path = require("path");
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class Configuration
{
	// Verify that all added options have documentation/meta -- 
	// output warnings for the ones that don't
	static verifyDocumentation()
	{
	}

	static getConfigurationMeta()
	{
		/* default and current are populated automatically */
		return {
			name : {
				category	: "General",
				label		: "Name",
				type		: "string",
				ui			: "textbox",
				doc			: `A name of your choice identifying this camera`,
			},

			password : {
				category	: "General",
				label		: "Name",
				type		: "string",
				ui			: "password",
				doc			: `Password required to access settings and video streams. Leave empty for no password.`,
			},

			videoPort : {
				category	: "Internal",
				label		: "Video Port",
				type		: "int",
				range		: [1025, 65535],
				step		: 1,
				ui			: "textbox",
				doc			: `(internal) for camera (video)`,
			}

// XXX: how do we document the parent ofwith sub-categories?

		}
	}

	static get()
	{
		return {
			// General
			name			: "Camera at default location",			// A name of your choice identifying this camera
			password		: "",									// TODO: be able to password protect stream (need to pass pw on connect)

			// Internal ports
			videoPort		: 8000,									// (internal) for camera (video)
			motionPort		: 8001,									// (internal) for camera (motion data)

			// Webserver
			wwwPort			: 8080,									// (public) for client (web content)
			publicPath		: path.resolve("../client/public/"),	// The _public_ directory accessible by clients

			// Public ports and limitations
			videoWsPort		: 8081,									// (public) for client (stream)
			motionWsPort	: 8082,									// (public) for client (motion stream)
			wsClientLimit	: 100,									// max number clients allowed

			// Video settings
			// NOTE: If new settings are added to camera, make sure
			//       they are also flagged as 'requires restart' in
			//       'reconfigure' (a const called 'cameraSettings').
			bitRate			: 1700000,								// Bitrate of video stream
			frameRate		: 24,									// 30 FPS seems to be a bit high for single core - let's go for Hollywood standard!
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
			streamVideo		: true,									// Toggle streaming of video (can be changed runtime)
			onlyActivity	: false,									// Stream only _video_ when there is 'valid' activity (experimental!)
																	// You will want to set 'minActiveBlocks' to 20 or so, depending on i
																	// lighting conditions (there's always some noise).

			// Ignore
			ignoreArea		: [],									// If setting manually, remember resolution should be 1920x1088.
																	// Format, a convex hulled polygon [ { x: ?, y: ? }, ... ] (i.e. array of objects with x/y pairs)

			// Recording settings
			mayRecord		: true,									// If true, will allocate a buffer of the past
			recordBufferSize: (3 * 1024 * 1024),					// How much to video (in bytes) to buffer for pre-recording
			recordPath		: path.resolve("../client/public/clips/"),// Where to store recordings
			recordPathWww	: "/clips/",							// Where a web-client can find clips/etc
			recordHistory	: 20,									// Number of latest clips to report to clients

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
			serviceName		: "MintyMint",							// You want to have this the same on ALL your devices (unless you want to group them)
			discovery		: true,									// Whether to discover neighbouring cameras (TODO: Rename to 'discover')
			announce		: true,									// Whther to announce presence to neighbouring cameras

			//
			// Advanced/debug/test settings
			//

			spawnInShell			: false,						// Whether to spawn signal scrips in a shell or not (in shell is slower)

			// Cluster definition
			clusterEpsilon			: 2,							// The max distance (manhattan) to include points in a cluster (DBscan)
			clusterMinPoints		: 4,							// The min number of points to be classified as a cluster (DBscan)
			clusterDistancing		: 'Manhattan',					// Manhattan or Euclidean
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
			sendClusters			: true,							// This is activity that happened _now_
			sendHistory				: false,						// This is activity that happened now _and_ clusters that are deemed important

			// Performance output/tests
			//
			// also - https://nodejs.org/en/docs/guides/simple-profiling/ :
			// $ node --prof index.js
			// $ node --prof-process isolate-nnn > processed.txt
			outputMotionCost		: 0,							// Output motion performance averages every N frames (0 = disabled)
			motionCostThreshold		: 30,							// Output cost when things were costly. Set this really high (1000+) to never see it.

		};
	}
}

exports.default = Configuration;
