/**
 *	Motion listener listens to input from camera.
 */
"use strict";

const Util = require("./util");

const { BufferListStream } = require('bl'); // XXX: It's a bit silly to include this one, but it saved me a little time.
const mvrproc = require("./MvrProcessor");
const MvrProcessor = mvrproc.default;
const MvrFilterFlags = mvrproc.MvrFilterFlags;

const net = require('net');
//const dgram = require('dgram');

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const skipMotionFramesAtStart = 17;

class MotionListener
{
	constructor(conf, motionSender)
	{
		this.conf = conf;
		this.motionSender = motionSender;

		this.vectorsPerLine = Util.getVecWidth(this.conf.get("width"));
		this.vectorLines = Util.getVecHeight(this.conf.get("height")); 
		this.frameLength = this.vectorsPerLine * this.vectorLines * 4;

		this.mvrProcessor = this.setupMotionProcessor();

		this.stop = false;
	}

    setupMotionProcessor()
    {
		return new MvrProcessor(this.conf.get("framerate"), this.conf.get("width"), this.conf.get("height"));
    }


	stopSending()
	{
		logger.info("Stop transmitting motion data");
		this.stop = true;
	}

	resumeSending()
	{
		logger.info("Resume transmitting motion data");
		this.stop = false;
	}

	/**
	 * Note: You want to stop sending and resume if resizing...
	 */
	resize(w, h)
	{
		this.vectorsPerLine = Util.getVecWidth(w);
		this.vectorLines = Util.getVecHeight(h); 
		this.frameLength = this.vectorsPerLine * this.vectorLines * 4;
		this.mvrProcessor(w, h);
	}

	start()
	{
        const tcpServer = net.createServer((socket) => {
            logger.info('Motion streamer connected');

            socket.on('end', () => {
                logger.info('Motion streamer disconnected');
            });


//            let vectorLines = Math.floor( this.conf.get("height") / 16) + 1;
//            let vectorsPerLine = Math.floor( this.conf.get("width") / 16) + 1;
/*
			let vectorLines = Util.getVecHeight(this.conf.get("height")); 
            let vectorsPerLine = Util.getVecWidth(this.conf.get("width"));
            let frameLength = vectorsPerLine * vectorLines * 4;
*/
            let bl = new BufferListStream();
            let frameData = null;
            let frameCount = 0;
            let clusters = null;
            let str;

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

                    if(skipMotionFramesAtStart > frameCount++) {
                        logger.debug("Skipping motion frame %d/%d...", frameCount, skipMotionFramesAtStart);
                        bl.consume(this.frameLength);
                        return;
                    }

                    // Protect against eating too much damn memory if we are too slow.
                    if(bl.length > this.frameLength * 3) {
                        logger.warn("Discarding motion frames, we are probably too slow.");
                        do {
                            bl.consume(this.frameLength);
                        } while(bl.length > (this.frameLength * 3))
                    }

                    //frameData = bl.shallowSlice(0, frameLength);      // argh, this does not expose fill() -- oh well, a memory copy then :(
                    frameData = bl.slice(0, this.frameLength);

//                  console.time("processFrame");
                    clusters = this.mvrProcessor.processFrame(
                        frameData,
                        MvrFilterFlags.MAGNITUDE_LT_300 | MvrFilterFlags.DX_DY_LT_2 | MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE
                    );
//                  console.timeEnd("processFrame");

                    bl.consume(this.frameLength);

                    this.motionSender.broadcastRaw(frameData, this.frameLength, true);

                    this.motionSender.broadcastMessage(
                        {
                            clusters : clusters,
                            history : this.mvrProcessor.getActiveClusters()
                        }
                    );
                }

            });

			socket.on('error', (e) => {
                logger.error('motion error %s', e);
                process.exit(0);
            })
        });

        tcpServer.listen(this.conf.get('motionport'));

        if (this.conf.get('motionport') == 'systemd') {
            logger.info('Motion TCP server listening on systemd socket');
        } else {
            var address = tcpServer.address();
            if (address) {
                logger.info(`Motion TCP server listening on %s:%d`, address.address, address.port);
            }
        }
	} // start()

}

exports.default = MotionListener;

