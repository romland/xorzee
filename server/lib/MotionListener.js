/**
 * Motion listener listens to input from camera.
 * TODO: refactor away all MVR fiddling into MotionSender (only forward data from here)
 */
"use strict";

const Util = require("./util");

const { BufferListStream } = require('bl'); // XXX: It's a bit silly to include this one, but it saved me a little time.
const mvrproc = require("./MvrProcessor");
const MvrProcessor = mvrproc.default;
const MvrFilterFlags = mvrproc.MvrFilterFlags;
const cp = require('child_process');
const kill = require('tree-kill');

const net = require('net');
//const dgram = require('dgram');

const MotionRuleEngine = require("./MotionRuleEngine").default;

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class MotionListener
{
	constructor(conf, motionSender, videoListener, eventCallback)
	{
		this.conf = conf;
		this.motionSender = motionSender;

		if(!this.motionSender) {
			throw Err("motionSender is mandatory");
		}

		this.startupIgnoreTime = this.conf.get("startupIgnore");

		this.vectorsPerLine = Util.getVecWidth(this.conf.get("width"));
		this.vectorLines = Util.getVecHeight(this.conf.get("height")); 
		this.frameLength = this.vectorsPerLine * this.vectorLines * 4;

		this.mvrProcessor = this._setupMotionProcessor();

		this.motionRuleEngine = new MotionRuleEngine(conf, this.mvrProcessor, videoListener, eventCallback);
		this.motionRuleEngine.start();

		this.cost = {
			frameCount : 0,
			processFrameCostTot : 0,
			processFrameCostAvg : 0,
			processFrameCostMin : 1000,
			processFrameCostMax : 0,
			frame : {
			}
		};

		this.stop = false;
	}


	_setupMotionProcessor()
	{
		return new MvrProcessor(this.conf);
	}


	stopSending()
	{
		logger.debug("Stop transmitting motion data");
		this.stop = true;
	}


	resumeSending()
	{
		logger.debug("Resume transmitting motion data");
		this.stop = false;
	}


	/**
	 * Note: You want to stop sending and resume if resizing...
	 */
	reconfigure(w, h)
	{
		// TODO: w/h is now ignored (fix all places calling this method)

		this.vectorsPerLine = Util.getVecWidth(this.conf.get("width"));
		this.vectorLines = Util.getVecHeight(this.conf.get("height")); 
		this.frameLength = this.vectorsPerLine * this.vectorLines * 4;
		this.mvrProcessor.reconfigure(this.conf, this.conf.get("width"), this.conf.get("height"));
	}


	start()
	{
		return this._startRust();
		// return this._startNode();
	}

	stop()
	{
		if(!this.mvrProcess) {
			return;
		}

		logger.debug("Stopping mvr...");

		this.mvrProcess.stdin.pause();
		logger.debug("Killing mvr PID %d", this.mvrProcess.pid);

		await kill(this.mvrProcess.pid);
		this.mvrProcess = null;

		logger.info("Stopped mvr");
	}

	/**
	 * Uses Rust MVR processor
	 * 
	 * This is currently one big hack to get it to fit in.
	 */
	/*
	BIG FAT TODOS:
	-	there are things in the node version that needs to be ported to Rust,
		such as ignore-area (etc?)

	-	start/stopping (this is very connected to camera)
		- even though it's not _always_ necessary, it's easiest to restart
		  mvr-processor every time camera restarts (then we can tag along
		  camera's code for resolution reconfiguration etc)

	-	should reduce the size of the JSON that comes from 'mvr', a lot of the stuff in there is not used
		The parsing does not come for free. Top says it goes from around 10% util to 15% (so a 50% increase for nodejs!)
	*/
	_startRust()
	{
		logger.info("Using Rust MVR processor");

		let mvr = "./bin/mvr";
		let mvrArgs = [];
		this.mvrProcess = cp.spawn(mvr, mvrArgs);

		let partial = "";
        this.mvrProcess.stdout.setEncoding('utf8');
        this.mvrProcess.stdout.on('data', (data) => {

			// TOOD: This can be rewritten to be more efficient.
			// What it does: Checks incoming data for a \n and only pass on
			// full 'messages' to clients (broadcastMessageStr)
			let nl = -1;
			partial += data;
		
			if((nl = partial.indexOf("\n")) === -1) {
				return;
			}

			let lastNl = partial.lastIndexOf("\n");
			let lines = partial.substr(0, lastNl).split("\n");
			if(lastNl === (partial.length - 1)) {
				partial = "";
			} else {
				partial = partial.substr(lastNl+1);
			}
		
			for(let i = 0; i < lines.length; i++) {
				// motionRuleEngine depend on the following to exist in MvrProcessor:
				//	this.mvrProcessor.getActiveClusters()
				//		history from JSON (mvrProcessor.history)
				//	this.mvrProcessor.getFrameInfo()
				//		frameInfo from JSON (mvrProcessor.frameInfo)
				// TODO: In the medium-term I will ditch the Node version
				//       and this hack of setting these varaibles in MvrProcessor
				//		 will be integrated in whatever replaces it.
				
				let ob = JSON.parse(lines[i]);
				if(!ob.frameInfo) {
					continue;
				}

				// console.log(ob);
				this.mvrProcessor.history = ob.history;
				this.mvrProcessor.frameInfo = ob.frameInfo;
				this.motionRuleEngine.processFrame();
				
				this.motionSender.broadcastMessageStr(lines[i]);
			}
		
        });

        this.mvrProcess.stderr.setEncoding('utf8');
        this.mvrProcess.stderr.on('data', function(data) {
            logger.debug('mvr-stderr: %s', data);
        });

        this.mvrProcess.on('close', function(code) {
            logger.warn('mvr closed: %s', code);
			throw Error("MVR closed -- see above. This usually means it's closed quickly because an instance was already running");
        });

		logger.debug("Started mvr with PID %d", this.mvrProcess.pid);

		if(!this.mvrProcess.pid) {
			logger.warn("Could probably not start camera; something already using it?");
		}

	}


	/**
	 * Uses JavaScript MVR processor
	 */
	_startNode()
	{
		logger.info("Using Node MVR processor");

        const tcpServer = net.createServer((socket) => {
            logger.debug('Motion streamer connected');

			if(this.conf.get("trackMotion") === false) {
				logger.info("But NOTE: Motion tracking is disabled by configuration (trackMotion)");
			}

            socket.on('end', () => {
                logger.debug('Motion streamer disconnected');
            });

            let bl = new BufferListStream();
            let frameData = null;
            let clusters = null;
            let str;

			let skip = true;
			let started = Date.now();
			let cost;

            socket.on('data', (data) => {
				if(this.conf.get("trackMotion") === false) {
					return;
				}

				if(this.stop) {
					logger.debug("Stopping sending of motion data...");

					if(bl.length > 0) {
						bl.consume(bl.length);
					}
					return;
				}

				bl.append(data);

				while(true) {
					if(bl.length < this.frameLength) {
						break;
					}

					//console.log("===");
					//console.time("motionFrameTotal");

					if(skip) {
						logger.debug("Skipping motion frame (starting up)...");
						bl.consume(this.frameLength);
						if(Date.now() > (started + this.startupIgnoreTime)) {
							skip = false;
						}
                        return;
                    }

					cost = Date.now();

					this.cost.frame.ts = Date.now();

					// Protect against eating too much damn memory if we are too slow.
					if(bl.length > this.frameLength * 2) {
						logger.warn("Discarding motion frames, we are probably too slow.");
						do {
							bl.consume(this.frameLength);
						} while(bl.length > (this.frameLength * 2))
					}
					this.cost.frame.discard = Date.now() - this.cost.frame.ts;

					this.cost.frame.ts = Date.now();
					// Can I avoid this slice somehow?
                    frameData = bl.slice(0, this.frameLength);

					this.cost.frame.slice = Date.now() - this.cost.frame.ts;

					this.cost.frame.ts = Date.now();
                    clusters = this.mvrProcessor.processFrame(
                        frameData,
                        MvrFilterFlags.MAGNITUDE_LT_300 | MvrFilterFlags.DX_DY_LT_2 | MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE
                    );
					this.cost.frame.clustering = Date.now() - this.cost.frame.ts;

					this.cost.frame.ts = Date.now();
					this.motionRuleEngine.processFrame(frameData, clusters);
					this.cost.frame.motionrules = Date.now() - this.cost.frame.ts;

					this.cost.frame.ts = Date.now();
					bl.consume(this.frameLength);
					this.cost.frame.consume = Date.now() - this.cost.frame.ts;

					if(this.conf.get("sendRaw") === true) {
						this.cost.frame.ts = Date.now();
						this.motionSender.broadcastRaw(frameData, this.frameLength, true);
						this.cost.frame.sendraw = Date.now() - this.cost.frame.ts;
					}

					this.cost.frame.ts = Date.now();
					this.motionSender.broadcastMessage(
						{
							clusters : this.conf.get("sendClusters") ? clusters : null,
							history : this.conf.get("sendHistory") ? this.mvrProcessor.getActiveClusters() : null,
							frameInfo : {
								mag: Math.round(this.mvrProcessor.getFrameInfo().totalMagnitude), // total magnitude of frame
								candidates: this.mvrProcessor.getFrameInfo().candidates // num active vectorsPerLine
							}
						}
					);
					this.cost.frame.broadcast = Date.now() - this.cost.frame.ts;

					this.cost.frameCount++;
					cost = Date.now() - cost;

					this.cost.processFrameCostTot += cost;
					this.cost.processFrameCostAvg = this.cost.processFrameCostTot / this.cost.frameCount;
					if(cost < this.cost.processFrameCostMin)
						this.cost.processFrameCostMin = cost;
					if(cost > this.cost.processFrameCostMax)
						this.cost.processFrameCostMax = cost;

					if(cost > this.conf.get("motionCostThreshold")) {
						logger.warn(
							"Process motion frame cost > %d ms: %d ms. Clusters: %d, history: %d",
							this.conf.get("motionCostThreshold"),
							cost,
							clusters.length,
							this.mvrProcessor.getActiveClusters().length
						);
						console.log(this.mvrProcessor.stats.costLastFrame, this.cost.frame);
						console.log("motionRuleEngine costs:", this.motionRuleEngine.cost);
//						this.mvrProcessor.outputCost(true);
					}

					//console.timeEnd("motionFrameTotal");
					if(this.conf.get("outputMotionCost") > 0 && (this.cost.frameCount % this.conf.get("outputMotionCost")) === 0) {
						console.log(this.cost);
					}
				} // once per frame

            });

			socket.on('error', (e) => {
                logger.error('motion error %s', e);
                process.exit(0);
            })
        });

        tcpServer.listen(this.conf.get('motionPort'));

        if (this.conf.get('motionPort') == 'systemd') {
            logger.debug('Motion TCP server listening on systemd socket');
        } else {
            var address = tcpServer.address();
            if (address) {
                logger.debug(`Motion TCP server listening on %s:%d`, address.address, address.port);
            }
        }
	} // start()

}

exports.default = MotionListener;

