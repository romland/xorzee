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
        const tcpServer = net.createServer((socket) => {
            logger.debug('Motion streamer connected');

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
							history : this.conf.get("sendHistory") ? this.mvrProcessor.getActiveClusters() : null
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

