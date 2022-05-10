const path = require("path");
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const os = require("os");

class Configuration
{
	// Verify that all added options have documentation/meta -- 
	// output warnings for the ones that don't
	static verifyDocumentation()
	{
	}

	/**
	 * This is passed to the client when they connect.
	 * 
	 * This serves a couple of purposes:
	 * - Tell client about defaults
	 * - Tell client what kind of UI should be used to change the setting
	 * - Tell client about datatypes
	 * - Documentation
	 * - I wanted the ability to _arbitrarily_ group settings on the client
	 * 
	 * JSON schema or something similar could have been an option, but
	 * arbitrarily grouping settings together using that turned out to be 
	 * too much of a hassle.
	 */
	static getConfigurationMeta()
	{
		const defaults = Configuration.get();

		const doc = {
			name : "", // the setting is in the root node
			label : "Settings",
			children : [
				{
					name : "", // the setting is in the root node
					label : "General",
					children: [
						{
							name		: "name",
							label		: "Name",
							type		: "string",
							ui			: "textbox",
							doc			: `A name of your choice identifying this camera`,
							'default'	: defaults.name,
						},
						{
							name		: "password",
							label		: "Password",
							type		: "string",
							ui			: "password",
							doc			: `Password required to access settings and video streams. Leave empty for no password.`,
							'default'	: defaults.password,
						},
					]
				},
				{
					name : "", // the setting is in the root node
					label : "Server",
					children: [
						{
							name		: "wwwPort",
							label		: "HTTP port",
							type		: "int",
							range		: [1, 65535],
							ui			: "textbox",
							doc			: `(public) for client (web content)`,
							'default'	: defaults.wwwPort,
						},
			
						{
							name		: "publicPath",
							label		: "Public path",
							type		: "string",
							ui			: "textbox",
							doc			: `The _public_ directory accessible by clients`,
							'default'	: defaults.publicPath,
						},
			
						{
							name		: "videoWsPort",
							label		: "Websocket port (video)",
							type		: "int",
							range		: [1025, 65535],
							ui			: "textbox",
							doc			: `(public) for client (stream)`,
							'default'	: defaults.videoWsPort,
						},
			
						{
							name		: "motionWsPort",
							label		: "Websocket port (data)",
							type		: "int",
							range		: [1025, 65535],
							ui			: "textbox",
							doc			: `(public) for client (motion stream)`,
							'default'	: defaults.videoWsPort,
						},
			
						{
							name		: "wsClientLimit",
							label		: "Max number of clients",
							type		: "int",
							range		: [0, 65535],
							ui			: "textbox",
							doc			: `max number clients allowed`,
							'default'	: defaults.wsClientLimit,
						},

					],
				},
				{
					name : "", // the setting is in the root node
					label : "Video quality and overlay",
					children: [
						{
							name		: "bitRate",
							label		: "Bit rate",
							type		: "int",
							range		: [1, 9999999],
							ui			: "textbox",
							doc			: `Bitrate of video stream`,
							'default'	: defaults.bitRate,
						},
						{
							name		: "frameRate",
							label		: "Frame rate",
							type		: "int",
							range		: [0, 144],
							ui			: "textbox",
							doc			: `Frames per second to send`,
							'default'	: defaults.frameRate,
						},
						{
							name		: "width",
							label		: "Width",
							type		: "int",
							range		: [32, 3840],
							ui			: "textbox",
							doc			: `Video stream width (the higher resolution, the more exact motion tracking)`,
							'default'	: defaults.width,
						},
			
						{
							name		: "height",
							label		: "Height",
							type		: "int",
							range		: [32, 2160],
							ui			: "textbox",
							doc			: `Video stream height`,
							'default'	: defaults.height,
						},
			
						{
							name		: "startupIgnore",
							label		: "Warm-up time",
							type		: "int",
							range		: [0, 10000],
							ui			: "textbox",
							doc			: `How long (milliseconds) we should ignore motion after starting up camera`,
							'default'	: defaults.startupIgnore,
						},

						{
							label		: "Stream overlay",
							name		: "streamOverlay",	// children are not in root-node (/streamOverlay/...)
							children : [
								{
									name		: "enabled",
									label		: "Show overlay",
									type		: "bool",
									ui			: "checkbox",
									doc			: `Enable overlay`,
									'default'	: defaults.streamOverlay.enabled,
								},
								{
									name		: "showName",
									label		: "Show name in overlay",
									type		: "bool",
									ui			: "checkbox",
									doc			: `Show name of camera`,
									'default'	: defaults.streamOverlay.showName,
								},
								{
									name		: "text",
									label		: "Overlay text",
									type		: "string",
									ui			: "textbox",
									doc			: `Misc text, can contain a few \n and date/time substitutions. Time: %Y = year, %m = month, %d = day of month, %Z = timezone name, %z = timezone offset, %p = AM/PM, %X = current time with seconds (hh:mm:ss)`,
									'default'	: defaults.streamOverlay.text,
								},
								{
									name		: "fontSize",
									label		: "Font size",
									type		: "int",
									range		: [1, 200],
									ui			: "textbox",
									doc			: `Font size`,
									'default'	: defaults.streamOverlay.fontSize,
								},
								{
									name		: "textLuminance",
									label		: "Text luminance",
									type		: "int",
									nullable	: true,	// TODO: honestly not sure how to deal with this yet
									range		: [0, 255],
									ui			: "textbox",
									doc			: `null/auto = auto, otherwise a value between 0 and 255`,
									'default'	: defaults.streamOverlay.textLuminance,
								},
								{
									name		: "justify",
									label		: "Justify",
									type		: "int",
									range		: [0, 2],
									ui			: "textbox",
									doc			: `0=center, 1=left, 2=right`,
									'default'	: defaults.streamOverlay.justify,
								},
								{
									name		: "top",
									label		: "Top",
									type		: "int",
									range		: [0, 2160],
									ui			: "textbox",
									doc			: `placement, pixels from the top`,
									'default'	: defaults.streamOverlay.top,
								},
								{
									name		: "left",
									label		: "Left",
									type		: "int",
									range		: [0, 3840],
									ui			: "textbox",
									doc			: `placement, pixels from the left`,
									'default'	: defaults.streamOverlay.left,
								},
								{
									name		: "backgroundColor",
									label		: "Background colour",
									type		: "string",
									ui			: "textbox",
									doc			: `'transparent' or rgb (e.g. ff00ff)`,
									'default'	: defaults.streamOverlay.backgroundColor,
								},
							], // streamOverlay children
						} // streamOverlay
					], // video children
				}, // video category
				{
					name : "", // the setting is in the root node
					label : "Video streaming",
					children: [
						{
							name		: "streamVideo",
							label		: "Stream video",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Toggle streaming of video (can be changed runtime)`,
							'default'	: defaults.streamVideo,
						},
						{
							name		: "onlyActivity",
							label		: "Stream video only on activity",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Stream only _video_ when there is 'valid' activity (experimental!). You will want to set 'minActiveBlocks' to 20 or so, depending on lighting conditions (there's always some noise).`,
							'default'	: defaults.onlyActivity,
						},
						{
							name		: "serverSideMuxing",
							label		: "Mux on the Pi (instead of in browser)",
							type		: "bool",
							ui			: "checkbox",
							doc			: `NOT YET IMPLEMENTED. If you have spare cycles on the Raspberry Pi, you can choose to offload some work to it instead of having it happen on every client (recommended if you can).`,
							'default'	: defaults.serverSideMuxing,
						},
					]
				}, // video streaming
				/*{
					we have UI elsewhere for setting ignore areas
				}*/
				{
					name : "", // the setting is in the root node
					label : "Automatic recording",
					children: [
						{
							name		: "mayRecord",
							label		: "Record video",
							type		: "bool",
							ui			: "checkbox",
							doc			: `If true, will allocate a buffer of the past. Setting simulateRecord to true will prevent files from being written to disk.`,
							'default'	: defaults.mayRecord,
						},
						{
							name		: "alwaysScreenshot",
							label		: "Always snapshot on activity",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Snapshot will be taken even if mayRecord is false and, perhaps SURPRISINGLY, even if 'dryRun' is set to true (this last bit because it's handy in debugging)`,
							'default'	: defaults.alwaysScreenshot,
						},
						{
							name		: "recordBufferSize",
							label		: "Record buffer size",
							type		: "int",
							range		: [0, 100000000],
							ui			: "textbox",
							doc			: `How much video (in bytes) to buffer for pre-recording. 3 MiB (3,145,728 bytes) is default.`,
							'default'	: defaults.recordBufferSize,
						},
						{
							name		: "recordPath",
							label		: "Record path",
							type		: "string",
							ui			: "textbox",
							doc			: `Where to store recordings. Default is client/public/clips/`,
							'default'	: defaults.recordPath,
						},
						{
							name		: "recordPathWww",
							label		: "Public record path",
							type		: "string",
							ui			: "textbox",
							doc			: `Where a web-client can find clips/etc`,
							'default'	: defaults.recordPathWww,
						},
						{
							name		: "recordHistory",
							label		: "Number of historical recordings",
							type		: "int",
							range		: [0, 100000000],
							ui			: "textbox",
							doc			: `Number of latest clips to report to clients when they connect`,
							'default'	: defaults.recordHistory,
						},
						{
							name		: "trackReasons",
							label		: "Track reasons for start/stop recording",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to track why start/stop recording did not trigger on a frame`,
							'default'	: defaults.trackReasons,
						},
						{
							name		: "simulateRecord",
							label		: "Simulate record (dry run)",
							type		: "bool",
							ui			: "checkbox",
							doc			: `If true, dry-run when it comes to recordings (i.e. nothing written to disk)`,
							'default'	: defaults.simulateRecord,
						},
						{
							label		: "Start record requirements",
							name		: "startRecordRequirements",	// children of this are not in root-node
							children : [
								{
									name		: "activeTime",
									label		: "Active time",
									type		: "int",
									range		: [0, 100000],
									ui			: "textbox",
									doc			: `Time (in milliseconds) that needs to be deemed active to trigger recording`,
									'default'	: defaults.startRecordRequirements.activeTime,
								},
								{
									name		: "minFrameMagnitude",
									label		: "Minimum frame magnitude",
									type		: "int",
									range		: [0, 100000],
									ui			: "textbox",
									doc			: `Total magnitude of motion to be beaten to allow start of recording`,
									'default'	: defaults.startRecordRequirements.minFrameMagnitude,
								},
								{
									name		: "minActiveBlocks",
									label		: "Minimum number of active blocks",
									type		: "int",
									range		: [0, 100000],
									ui			: "textbox",
									doc			: `Total number of 'blocks'/vectors that need to be in play to allow start of recording`,
									'default'	: defaults.startRecordRequirements.minActiveBlocks,
								},
								{
									name		: "minInterval",
									label		: "Minimum interval between recordings",
									type		: "int",
									range		: [0, 900000],
									ui			: "textbox",
									doc			: `Do not start recording again if we stopped a previous one less than this long ago (milliseconds)`,
									'default'	: defaults.startRecordRequirements.minInterval,
								},
							]
						}, // startRecordRequirements
						{
							label		: "Stop record requirements",
							name		: "stopRecordRequirements",	// children of this are not in root-node
							children : [
								{
									name		: "stillTime",
									label		: "Minimum still time",
									type		: "int",
									range		: [0, 900000],
									ui			: "textbox",
									doc			: `How long the view must be deemed not moving before we can stop recording (milliseconds)`,
									'default'	: defaults.stopRecordRequirements.stillTime,
								},
								{
									name		: "maxFrameMagnitude",
									label		: "Maximum frame magnitude",
									type		: "int",
									range		: [0, 1000000],
									ui			: "textbox",
									doc			: `A frame is deemed 'active' if it has a total magnitude of this (or more)`,
									'default'	: defaults.stopRecordRequirements.maxFrameMagnitude,
								},
								{
									name		: "maxRecordTime",
									label		: "Maximum record time",
									type		: "int",
									range		: [0, 600000],
									ui			: "textbox",
									doc			: `Max length in milliseconds to record (+ what is buffered). Default is one minute (60,000)`,
									'default'	: defaults.stopRecordRequirements.maxRecordTime,
								},
								{
									name		: "minRecordTime",
									label		: "Minimum record time",
									type		: "int",
									range		: [0, 6000000],
									ui			: "textbox",
									doc			: `Minimum length in milliseconds to record (- what is buffered)`,
									'default'	: defaults.stopRecordRequirements.minRecordTime,
								},
							]
						} // stopRecordRequirements

					] // Recording children
				}, // Recording
				{
					label		: "Signals (TODO: enable/disable; ln -s)",
					name		: "",
					doc			: `The signals array is populated automatically with all files in the conf/available-signals/*.conf. TODO: Make some web UI to enable/disable signals?`,
					children : [
						{
							label		: "Send mail using SES",
							name		: "sendMailSES",
							doc			: `These settings is for if you are using the signal StandardSignals.EMAIL_SES. For further doc see: https://github.com/aheckmann/node-ses`,
							
							children : [
								{
									name		: "key",
									label		: "AWS SES key",
									type		: "string",
									ui			: "textbox",
									doc			: `your AWS SES key`,
									'default'	: defaults.sendMailSES.key,
								},
								{
									name		: "secret",
									label		: "AWS SES secret",
									type		: "string",
									ui			: "textbox",
									doc			: `your AWS SES secret`,
									'default'	: defaults.sendMailSES.secret,
								},
								{
									name		: "amazon",
									label		: "AWS end-point",
									type		: "string",
									ui			: "textbox",
									doc			: `[optional] the amazon end-point uri. defaults to https://email.us-east-1.amazonaws.com`,
									'default'	: defaults.sendMailSES.amazon,
								},

							]
						}
					]
				}, // Signals
				{
					name : "", // the setting is in the root node
					label : "Discovery and announcement",
					children: [
						{
							name		: "serviceName",
							label		: "Service name",
							type		: "string",
							ui			: "textbox",
							doc			: `You want to have this the same on ALL your devices (unless you want to create multiple subsets of cameras)`,
							'default'	: defaults.serviceName,
						},
						{
							name		: "discover",
							label		: "Discover neighbours",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to discover neighbouring cameras`,
							'default'	: defaults.discover,
						},
						{
							name		: "announce",
							label		: "Announce to neighbours",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to announce presence to neighbouring cameras`,
							'default'	: defaults.announce,
						},
					]
				}, // discovery
				{
					name : "", // the setting is in the root node
					label : "Advanced: Misc",
					children: [
						{
							name		: "videoPort",
							label		: "Internal port (video data)",
							type		: "int",
							range		: [1025, 65535],
							ui			: "textbox",
							doc			: `Internal port for camera's video data`,
							'default'	: defaults.videoPort,
						},
						{
							name		: "motionPort",
							label		: "Internal port (motion data)",
							type		: "int",
							range		: [1025, 65535],
							ui			: "textbox",
							doc			: `Internal port for camera's motion data`,
							'default'	: defaults.motionPort,
						},
						{
							name		: "spawnInShell",
							label		: "Spawn signals in shell",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to spawn signal scrips in a shell or not (in shell is slower, but there may be reasons why one would need it)`,
							'default'	: defaults.spawnInShell,
						},
					]
				}, // misc. advanced
				{
					name : "", // the setting is in the root node
					label : "Advanced: Motion",
					children: [
						{
							name		: "trackMotion",
							label		: "Track motion",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Enabled/disable motion tracking (automatic recording will be disabled if motion tracking is)`,
							'default'	: defaults.trackMotion,
						},
						{
							name		: "clusterEpsilon",
							label		: "Cluster epsilon",
							type		: "int",
							range		: [1, 16],
							ui			: "textbox",
							doc			: `The max distance (manhattan) to include points in a cluster (DBscan)`,
							'default'	: defaults.clusterEpsilon,
						},
						{
							name		: "clusterMinPoints",
							label		: "Minimum cluster size",
							type		: "int",
							range		: [1, 2000],
							ui			: "textbox",
							doc			: `The minimum number of points needed to be classified as a cluster/object`,
							'default'	: defaults.clusterMinPoints,
						},
						{
							name		: "clusterDistancing",
							label		: "Distancing algorithm",
							type		: "int",
							range		: [1, 2000],
							ui			: "textbox",
							doc			: `Manhattan or Euclidean`,
							'default'	: defaults.clusterDistancing,
						},
						{
							name		: "preFilterLoners",
							label		: "Pre-filter loners",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to filter out loners before density scan to (_possibly_) make clustering cheaper`,
							'default'	: defaults.preFilterLoners,
						},
						{
							name		: "discardInactiveAfter",
							label		: "Pre-filter loners",
							type		: "int",
							range		: [0, 10000],
							ui			: "textbox",
							doc			: `If a cluster was still for longer than this, discard it`,
							'default'	: defaults.discardInactiveAfter,
						},
						{
							name		: "vectorMinMagnitude",
							label		: "Minimum magnitude of vector",
							type		: "int",
							range		: [0, 1000],
							ui			: "textbox",
							doc			: `Minimum magnitude of a vector to be deem it moving`,
							'default'	: defaults.vectorMinMagnitude,
						},
						{
							name		: "sendRaw",
							label		: "Send raw vectors to client",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Whether to pass raw vectors to client (debug -- enable RENDER_RAW on client too)`,
							'default'	: defaults.sendRaw,
						},
						{
							name : "", // the setting is in the root node
							label : "Cluster history",
							doc : `Depending on implementation client-side, we are either using current clusters or _historical_ clusters. It's recommended
								to not send over both as JSON serialization gets pretty costly. In the future I may actually have to resort to some binary
								output of the MvrProcessor so that more data can be passed over the wire.`,
							children: [
								{
									name		: "sendClusters",
									label		: "Send clusters to client",
									type		: "bool",
									ui			: "checkbox",
									doc			: `This is activity that happened _now_`,
									'default'	: defaults.sendClusters,
								},
								{
									name		: "sendHistory",
									label		: "Send cluster history to client",
									type		: "bool",
									ui			: "checkbox",
									doc			: `This is activity that happened now _and_ clusters that are deemed important`,
									'default'	: defaults.sendHistory,
								},
							]
						},
						{
							name : "", // the setting is in the root node
							label : "Cluster performance",
							doc : `Performance output/tests`,
							children :[
								{
									name		: "outputMotionCost",
									label		: "Output motion cost",
									type		: "int",
									range		: [0, 10000],
									ui			: "textbox",
									doc			: `Output motion performance averages every N frames (0 = disabled)`,
									'default'	: defaults.outputMotionCost,
								},
								{
									name		: "motionCostThreshold",
									label		: "Output motion cost threshold",
									type		: "int",
									range		: [0, 10000],
									ui			: "textbox",
									doc			: `Output cost when things were costly. Set this really high (1000+ milliseconds) to never see it.`,
									'default'	: defaults.motionCostThreshold,
								},
							]
						} // cluster performance
		
					] // advanced motion children
				},  // advanced motion
				{
					name : "", // the setting is in the root node
					label : "Timelapse",
					children: [
						{
							name		: "enabledTimelapse",
							label		: "Enable timelapse",
							type		: "bool",
							ui			: "checkbox",
							doc			: `Enable timelapse`,
							'default'	: defaults.timelapse.enabled,
						},
						{
							name		: "intervalSeconds",
							label		: "Interval",
							type		: "int",
							range		: [1, 99999999], // a year is 31.5 million seconds; 3 year interval ought to be enough for everyone
							ui			: "textbox",
							doc			: `Number of seconds between each snapshot (use a calculator :)`,
							'default'	: defaults.timelapse.intervalSeconds,
						},
						{
							name		: "overrideIntervalOnStartup",
							label		: "Snapshot on start-up",
							type		: "bool",
							ui			: "checkbox",
							doc			: `If disabled, on start up of Xorzee, it will wait until next interval to take a snapshot. If enabled, Xorzee will always take a snapshot when application starts.`,
							'default'	: defaults.timelapse.overrideIntervalOnStartup,
						},
						{
							name		: "fileNamePrefix",
							label		: "Filename for snapshots",
							type		: "string",
							ui			: "textbox",
							doc			: `The file name will automatically be suffixed with timestamp; YYYY-MM-DD-HH-mm-SS`,
							'default'	: defaults.timelapse.fileNamePrefix,
						},

					]
				} // timelapse
			] // root node children
		};
		
		return doc;
	}

	static get()
	{
		return {
			// General
			name			: os.hostname(),						// A name of your choice identifying this camera
			password		: "",									// TODO: be able to password protect stream (need to pass pw on connect)

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
			onlyActivity	: false,								// Stream only _video_ when there is 'valid' activity (experimental!)
																	// You will want to set 'minActiveBlocks' to 20 or so, depending on
																	// lighting conditions (there's always some noise).
			serverSideMuxing: false,

			// Ignore
			ignoreArea		: [],									// If setting manually, remember resolution should be 1920x1088.
																	// Format, a convex hulled polygon [ { x: ?, y: ? }, ... ] (i.e. array of objects with x/y pairs)

			// Recording settings
			mayRecord		: false,								// If true, will allocate a buffer of the past
			alwaysScreenshot: true,									// NOTE: This will be triggered despite mayRecord being false AND, SURPRISINGLY, even if 'dryRun' is set to true
			recordBufferSize: (3 * 1024 * 1024),					// How much video (in bytes) to buffer for pre-recording
			recordPath		: path.resolve("../client/public/clips/"),// Where to store recordings
			recordPathWww	: "/clips/",							// Where a web-client can find clips/etc
			recordHistory	: 20,									// Number of latest clips to report to clients

			trackReasons	: true,									// Whether to track why start/stop recording did not trigger on a frame
			simulateRecord	: true,									// If true, dry-run when it comes to recordings (i.e. nothing written to disk)

			startRecordRequirements : {
				activeTime			: 1000,							// Time that needs to be active to trigger recording
				minFrameMagnitude	: 1500,							// Total magnitude to be beaten to start recording
				minActiveBlocks		: 20,							// Total number of 'blocks'/vectors that need to be in play
				minInterval			: 5000,							// Do not start recording again if we stopped a previous one less than this ago
			},

			stopRecordRequirements : {
				stillTime			: 3000,							// How long things must be 'still' before we can stop recording
				maxFrameMagnitude	: 500,							// A frame is deemed 'active' if it has a total magnitude of this
				maxRecordTime		: 60000,						// Max length to record (+ what is buffered). Default is one minute.
				minRecordTime		: 2000,							// Min length reo record (- what is buffered)
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
				/* enable to properly debug
				logger: {
					debug: logger.debug,
					info: logger.info,
					warn: logger.warn,
					error: logger.error
				},
				*/
				silent: false,
				smtpPort: 25,
			},

			timelapse : {
				enabledTimelapse : false,
				intervalSeconds : 600,
				overrideIntervalOnStartup : false,
				fileNamePrefix : os.hostname() + "-timelapse"
			},

			// Discover settings
			serviceName		: "Xorzee",								// You want to have this the same on ALL your devices (unless you want to create multiple subsets of cameras)
			discover		: true,									// Whether to discover neighbouring cameras
			announce		: true,									// Whether to announce presence to neighbouring cameras

			//
			// Advanced/internal/debug/test settings
			//

			// Internal ports
			videoPort		: 8000,									// (internal) for camera (video)
			motionPort		: 8001,									// (internal) for camera (motion data)

			// Signal settings
			spawnInShell			: false,						// Whether to spawn signal scrips in a shell or not (in shell is slower)

			// General motion tracking
			trackMotion				: true,

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
			motionCostThreshold		: 1130,							// Output cost when things were costly. Set this really high (1000+) to never see it.

		};
	}
}

exports.default = Configuration;
