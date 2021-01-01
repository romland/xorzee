'use strict'
/**
 * Capture live motion vectors generated by encoding video coming from 
 * a connected sensor.
 * 20-may-2020, Joakim Romland
 *
 * I have since made a big mess of things and this now does a whole lot
 * more.
 * 01-jan-2021, Joakim Romland
 */

const Util = require("./util");
const DbScan = require("./DbScan");
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const MvrFilterFlags = {
	MAGNITUDE_LT_300 : 1,
	DX_DY_LT_2 : 2,
	FRAME_MAGNITUDE_400_INCREASE : 4,
	NO_SAD : 8,
}

class MvrProcessor
{
	/*
		Class scope variables
			this.stats
			this.mv (for pre-alloc purposes only)
			this.resolutionWidth
			this.resolutionHeight
			this.fps
			this.startTime
	*/
	//constructor(fps, resolutionWidth, resolutionHeight)
	constructor(conf)
	{
		this.conf = conf;

		// Totals
		this.stats = {
			frameCount : 0,
			flashes : 0,
			ignored : 0,
			previousFrameMagTotal : 0,
			motionFlashes : 0,
			ignoredFrames : 0,

			cost : {
				filterVectors : 0,
				clustering : 0,
				reducing : 0,
				maxClusteringCost : 0,
				lastFrame : 0,
			}
		};


		this.resetFrameInfo();

		this.mv = {
			dx : null,
			dy : null,
			sad : null,

			dir : null,
			mag : null
		};

		this.reconfigure(conf, this.conf.get("width"), this.conf.get("height"));
		this.fps = this.conf.get("framerate");
		this.startTime = Date.now();
		this.minMagnitude = this.conf.get("vectorMinMagnitude");

		this.history = [];
		this.historyClusterId = 1;
	}

	reconfigure(conf, w, h)
	{
		this.conf = conf;

		logger.debug("MvrProcessor got reconfigure", this.conf.get());

		this.frameDataWidth = Util.getVecWidth(w);
		this.frameDataHeight = Util.getVecHeight(h);

		this.resolutionWidth = w;
		this.resolutionHeight = h;
		this.fps = this.conf.get("fps");
		this.minMagnitude = this.conf.get("vectorMinMagnitude");

		this.history = [];

		if(this.conf.get("ignoreArea") && this.conf.get("ignoreArea").length > 2) {
			this.ignoredArea = Util.scalePolygon(
				this.conf.get("ignoreArea"),
				{ width: 1920, height: 1088},
				{ width: this.frameDataWidth, height: this.frameDataHeight },
				1,
				true
			);
			this.preCalculateIgnoredArea();
		} else {
			this.ignoredArea = null;
		}

		logger.debug("Ignored (vector) area set to %o", this.ignoredArea);
	}


	/**
	 * Expects point to be { x : ?, y : ? }
	 */
	inIgnoredArea(point)
	{
		if(this.ignoredArea === null) {
			return false;
		}

		return Util.pointIsInPoly(point, this.ignoredArea);
	}


	getFrameSize()
	{
		return this.frameDataHeight * this.frameDataWidth * 4;
	}

	getMotionVectorAt(buffer, index, outMv)
	{
		outMv.dx = buffer.readIntLE(index + 0, 1);
		outMv.dy = buffer.readIntLE(index + 1, 1);
		outMv.sad = buffer.readIntLE(index + 2, 2);

		// Angle
		outMv.dir = Math.atan2(outMv.dy, -outMv.dx) * 180 / Math.PI + 180;

		// Magnitude (Pythagoras) -- TODO: could just use Manhattan distance? (cheaper)
		outMv.mag = Math.sqrt(outMv.dx * outMv.dx + outMv.dy * outMv.dy);

		return outMv;
	}

	getTotalStats()
	{
		return this.stats;
	}

	getFrameStats(frameData)
	{
		let frameLength = this.getFrameSize();

		// To check ranges of the data to figure out savings...
		let maxDx = -1000000;
		let minDx = 1000000;
		let totDx = 0;

		let maxDy = -1000000;
		let minDy = 1000000;
		let totDy = 0;

		let maxSad = -1000000;
		let minSad = 1000000;
		let totSad = 0;

		let maxMag = -1000000;
		let minMag = 1000000;
		let totMag = 0;

		let maxDir = -1000000;
		let minDir = 1000000;
		let totDir = 0;

		let i = 0;

		let mv = this.mv;
		let ts = null;
		let vectorsPerFrame = this.getFrameSize();

		while(i < frameLength) {
			this.getMotionVectorAt(frameData, i, mv);

			//
			// Gather some stats on what data we are getting here...
			//
			if(mv.dx > maxDx) maxDx = mv.dx;
			if(mv.dx < minDx) minDx = mv.dx;
			totDx += mv.dx;

			if(mv.dy > maxDy) maxDy = mv.dy;
			if(mv.dy < minDy) minDy = mv.dy;
			totDy += mv.dy;

			if(mv.sad > maxSad) maxSad = mv.sad;
			if(mv.sad < minSad) minSad = mv.sad;
			totSad += mv.sad;

			if(mv.mag > maxMag) maxMag = mv.mag;
			if(mv.mag < minMag) minMag = mv.mag;
			totMag += mv.mag;

			if(mv.dir > maxDir) maxDir = mv.dir;
			if(mv.dir < minDir) minDir = mv.dir;
			totDir += mv.dir;

			i += 4;
		}

/*
		ts = ((Date.now() - this.startTime) / 1000);

		let out = ""
			+ "ts: " + Math.round(ts)
			+ "\tfps: " + Math.ceil(this.stats.frameCount / ts)
			+ "\tframe: " + this.stats.frameCount
			+ "\tdx: " + minDx +	" - " + maxDx + ` (${Math.round(totDx / vectorsPerFrame)})`
			+ "\tdy: " + minDy +	" - " + maxDy + ` (${Math.round(totDy / vectorsPerFrame)})`
			+ "\n"
			+ "dir: " + Math.round(minDir) +	"-" + Math.round(maxDir) + ` (${Math.round(totDir / vectorsPerFrame)})`
			+ "\n"
			+ "\tmag: " + minMag +	"-" + Math.round(maxMag) + ` (frame tot: ${Math.round(totMag)} vec avg: ${Math.round(totMag / vectorsPerFrame)})`
			+ "\n"
			+ "\tflashes: " + this.stats.motionFlashes
			+ "\tignored: " + this.stats.ignoredFrames
			+ "\tsad: " + minSad +	"-" + maxSad + ` (${Math.round(totSad / vectorsPerFrame)})`;

		console.clear();
		console.log(out);
		//Log.info(out);
*/
		return {
			"maxDx" : maxDx,
			"minDx" : minDx,
			"totDx" : totDx,
			"avgDx" : Math.round(totDx / vectorsPerFrame),

			"maxDy" : maxDy,
			"minDy" : minDy,
			"totDy" : totDy,
			"avgDy" : Math.round(totDy / vectorsPerFrame),

			"maxSad" : maxSad,
			"minSad" : minSad,
			"totSad" : totSad,
			"avgSad" : Math.round(totSad / vectorsPerFrame),

			"maxMag" : maxMag,
			"minMag" : minMag,
			"totMag" : totMag,
			"avgMag" : Math.round(totMag / vectorsPerFrame),

			"maxDir" : maxDir,
			"minDir" : minDir,
			"totDir" : totDir,
			"avgDir" : Math.round(totDir / vectorsPerFrame)
		};
	}


	isMover(buffer, index)
	{
		return Math.max( Math.abs(buffer.readIntLE(index + 0, 1)), Math.abs(buffer.readIntLE(index + 1, 1)) ) > this.minMagnitude;
	}

	isLoner(frameData, index)
	{
		let w4 = this.frameDataWidth * 4;
		let x = Math.floor(index % w4);
		let y = Math.floor(index / w4);

		// Above
		if(y > 0 && this.isMover(frameData, index - w4))
			return false;

		// Below
		if(y < (this.frameDataHeight-1) && this.isMover(frameData, index + w4))
			return false;

		// Left
		if(x > 0 && this.isMover(frameData, index - (1 * 4)))
			return false;

		// Right
		if(x < this.frameDataWidth && this.isMover(frameData, index + (1 * 4)))
			return false;

		// TODO: check diagonals
        // Left Above
        if(y > 0 && x > 0 && this.isMover(frameData, index - w4 - 4))
            return false;

        // Right Above
        if(y > 0 && x < (this.frameDataWidth-1) && this.isMover(frameData, index - w4 + 4))
            return false;

        // Left Below
        if(y < (this.frameDataHeight-1) && x > 0 && this.isMover(frameData, index + w4 - 4))
            return false;

        // Right Below
        if(y < (this.frameDataHeight-1) && x < (this.frameDataWidth - 1) && this.isMover(frameData, index + w4 + 4))
            return false;

		return true;
	}


	/**
	 * Cheaper than getFrameStats(), but has less information
	 */
	getFrameInfo()
	{
		return this.frameInfo;
	}


	resetFrameInfo()
	{
		// Info about last frame (for cheap querying)
		this.frameInfo = {
			nullFrame : false,
			totalMagnitude : 0,
			candidates : 0,			// "blocks"
			ignoredVectors : 0,
		};
	}


	outputCost()
	{
		if(this.conf.get("outputMotionCost") === 0) {
			return;
		}

		if(this.stats.frameCount > 0 && (this.stats.frameCount % this.conf.get("outputMotionCost")) === 0) {
			this.stats.averageCost = {
				filterVectors : (this.stats.cost.filterVectors / this.stats.frameCount),
				clustering : (this.stats.cost.clustering / this.stats.frameCount),
				reducing :  (this.stats.cost.reducing / this.stats.frameCount),
			};
			console.log(this.stats);
		}
	}

	preCalculateIgnoredArea()
	{
		this.ignoredAreaLookup = { };

		if(!this.ignoredArea) {
			return;
		}

		let i = 0;
		let frameLength = this.getFrameSize();

		let coord = {
			x : 0,
			y : 0
		};

		while(i < frameLength) {
			coord.x = ( (i/4) % this.frameDataWidth);
			coord.y = ( (i/4) / this.frameDataWidth);
			if(this.inIgnoredArea(coord)) {
				this.ignoredAreaLookup[i] = true;
			}

			i += 4;
		}
	}


	processFrame(frameData, filterFlags)
	{
		this.outputCost();

		let then;	// used for measuring cost and temporal tracking
		let i = 0;
//		let previousFrameMagTotal = 0;
		let frameLength = this.getFrameSize();
		let loners = [];
		let candidates = [];
		let sendingRaw = this.conf.get("sendRaw");
		let preFilterLoners = this.conf.get("preFilterLoners");

		this.resetFrameInfo();

		// Default filter flags
		if(!filterFlags) {
			filterFlags = MvrFilterFlags.DX_DY_LT_2 | MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE | MvrFilterFlags.MAGNITUDE_LT_300;
		}

		let x,y;

		then = Date.now();
		//console.time("filterVectors");
		while(i < frameLength) {
			if(this.ignoredArea !== null && this.ignoredAreaLookup[i] === true) {
				this.frameInfo.ignoredVectors++;
				i += 4;
				continue;
			}

			this.getMotionVectorAt(frameData, i, this.mv);

			if(preFilterLoners && this.mv.mag >= this.minMagnitude && this.isLoner(frameData, i)) {
				loners.push(i);
			} else if(this.mv.mag > this.minMagnitude) {
				x = ( (i/4) % this.frameDataWidth);
				y = Math.floor( (i/4) / this.frameDataWidth);

				candidates.push( { x : x, y : y } );
			}

			if(sendingRaw) {
				if((filterFlags & MvrFilterFlags.DX_DY_LT_2) === MvrFilterFlags.DX_DY_LT_2) {
					// 0x01
					if(Math.abs(this.mv.dx) < this.minMagnitude && Math.abs(this.mv.dy) < this.minMagnitude) {
						// Zero out this complete vector
						frameData.writeInt32LE(0, i); // WARNING: Changes the dataset!
						this.mv.dx = 0;
						this.mv.dy = 0;
						this.mv.sad = 0;
						this.mv.dir = 0;
						this.mv.mag = 0;
					}
				}

				if((filterFlags & MvrFilterFlags.NO_SAD) === MvrFilterFlags.NO_SAD) {
					// 0x02: zero out SAD of the vector
					frameData.writeInt16LE(0, i+2); // WARNING: Changes the dataset!
				}
			}

			this.frameInfo.totalMagnitude += this.mv.mag;
			i += 4;
		} // each vector

		//console.timeEnd("filterVectors");
		this.stats.cost.filterVectors += Date.now() - then;


		//console.time("filterFrame");
		if((filterFlags & MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE) === MvrFilterFlags.FRAME_MAGNITUDE_400_INCREASE) {
			// 400% increase in motion compared to last frame -- get this from encoder sometimes 
			// (is it camera? something else? what do these vectors look like?)
			// I see similarities to a SAD rendering in these flashes -- can I use that as a 
			// template to figure out whether to filter?
			if(this.stats.previousFrameMagTotal > 0 && this.frameInfo.totalMagnitude > (this.stats.previousFrameMagTotal * 4)) {
				// A motion flash!
				this.stats.motionFlashes++;
				
				//Log.info("FLASH! motion flash, exiting to investigate what the hell these vectors are!");
				//return;

				// Zero out frames that are motion-flashes [flash-rem in compression results]
				if(sendingRaw) {
					frameData.fill(0);	// WARNING: Changes the dataset!
				}
				this.frameInfo.nullFrame = true;
			}
			// -- flash check
		}
		
		if((filterFlags & MvrFilterFlags.MAGNITUDE_LT_300) === MvrFilterFlags.MAGNITUDE_LT_300) {
			// Check total magnitude of frame, if low, zero it
			// This is by no means a number I have come to with a lot of research,
			// so tweak/verify to hearts content!
			if(this.frameInfo.totalMagnitude < 300) {
				this.stats.ignoredFrames++;
				if(sendingRaw) {
					frameData.fill(0);	// WARNING: Changes the dataset!
				}
				this.frameInfo.nullFrame = true;
			}
		}
		//console.timeEnd("filterFrame");


		let clusters = [];
		if(!this.frameInfo.nullFrame) {

			for(let i = 0; i < loners.length; i++) {
				// TODO: Decrease this.frameInfo.totalMagnitude equivalent to the vectors we remove

				if(sendingRaw) {
					frameData.writeInt32LE(0, loners[i]); // WARNING: Changes the dataset!
				}
			}

			// =============== clustering

			// Thought: If we have a lot of candidates: Shrink the dataset by reducing 'resolution'
			//		remove every Nth and divide the coordinate of vector by N

			// let's say, if it is above 200 (nee 400) points, get it down to that...

			let reductionFactor;
			let targetCandidates = 200;
			let reduced = false;

//			console.log("loners", loners.length, "candidate points", candidates.length, "reduction factor", Math.floor(candidates.length/targetCandidates) );

			this.frameInfo.candidates = candidates.length;

			//console.time("reducing");
			then = Date.now();
			if(candidates.length > (targetCandidates * 1.25)) {
				reductionFactor = Math.floor(candidates.length / targetCandidates);
				let reducedCandidates = [];
				for(let i = 0; i < candidates.length; i += reductionFactor) {
					candidates[i].orgX = candidates[i].x;
					candidates[i].orgY = candidates[i].y;
					candidates[i].x = (candidates[i].x / reductionFactor);
					candidates[i].y = (candidates[i].y / reductionFactor);
					reducedCandidates.push(candidates[i]);
				}
				reduced = true;
				candidates = reducedCandidates;
			}
			//console.timeEnd("reducing");
			this.stats.cost.reducing += Date.now() - then;


			//console.time("clustering");
			then = Date.now();

			const scanner = new DbScan();
			scanner.setEps(this.conf.get("clusterEpsilon"));
			scanner.setMinPts(this.conf.get("clusterMinPoints"));
			scanner.setDistance(this.conf.get("clusterDistancing"));
			scanner.setData(candidates);
			const results = scanner.run();

			//console.timeEnd("clustering");

			let cost = Date.now() - then;
			this.stats.cost.clustering += cost;
			this.stats.cost.lastFrame = cost;
			if(cost > this.stats.cost.maxClusteringCost) {
				this.stats.cost.maxClusteringCost = cost;
			}

			//console.time("boundingbox");

			/*
			 * On clustering:
			 * Returns array 'results' (of same size as candidates):
			 *
			 *	if results[i] is 0 = noise
			 *	oterhwise results[i] = a cluster id
			 *		and 'i' = index of the candidate in 'candidates'
			 *
			 *	we then take candidates[i] and throw that into a grouped
			 *	collection. Ie. cluster[cluster-id] = [ candidates... ]
			 */

			let id, cluster;
			for(let i = 0; i < results.length; i++) {
				id = results[i];

				if(results[i] === 0) {
					// cluster 0 is noise?
					continue;
				}

				if(!clusters[id]) {
					clusters[id] = { points : [], /* clockwise from top */ box : [ 1000, 0, 0, 1000 ] };
				}
				cluster = clusters[id];

				if(reduced) {
					candidates[i].x = candidates[i].orgX;
					candidates[i].y = candidates[i].orgY;
				}

				cluster.points.push(candidates[i]);

				// Bounding box
				if(candidates[i].y < cluster.box[0]) cluster.box[0] = candidates[i].y;
				if(candidates[i].x > cluster.box[1]) cluster.box[1] = candidates[i].x;
				if(candidates[i].y > cluster.box[2]) cluster.box[2] = candidates[i].y;
				if(candidates[i].x < cluster.box[3]) cluster.box[3] = candidates[i].x;
			}

			if(clusters.length > 0) {
				clusters.splice(0, 1);
			}
			//console.timeEnd("boundingbox");
			// ================ /clustering


			// ================ remove clusters within others
			//console.time("insidereduction");
			for(let i = 0; i < clusters.length; i++) {
				if(this.isWithin(clusters[i], clusters, i)) {
					clusters[i].within = true;
				} else {
					// Cluster is not discarded
					this.trackTemporal(clusters[i], then);
				}
			}
			//console.timeEnd("insidereduction");
			// ================ /cluster removal


		} else {
//			console.log("nullframe");
		}


		this.stats.previousFrameMagTotal = this.frameInfo.totalMagnitude;
		this.stats.frameCount++;

		//console.time("temporalExpiration");
		if(this.history.length > 0) {
			this.temporalExpiration(then);
		}
		//console.timeEnd("temporalExpiration");

		return clusters;
	} // processFrame


	getActiveClusters()
	{
		return this.history;
	}


	/**
	 * overlapping is the cluster in history
	 */
	trackTemporal(cluster, now)
	{
		let overlapping = this.overlapsAny(cluster, this.history);
		if(overlapping !== false) {
			// update cluster in history
			cluster.age = now - overlapping.birth;
			overlapping.active = now;
			overlapping.age = cluster.age;

			// Do I want to update the history box? Let's see...
			// Do it only if we are more dense (and often bigger) than the one stored...
			if(cluster.points.length > overlapping.size) {
				overlapping.box = [...cluster.box];
//				overlapping.points = [...cluster.points];
				overlapping.size = cluster.points.length;
			}
		} else {
			// add new cluster to history
			this.history.push({
				id : this.historyClusterId++,
				age : 0,
				active : now,
				birth : now,
				box : [...cluster.box],
				size : cluster.points.length
			});
		}
	}


	// discardInactiveAfter
	// Expire ones that have had no activity for expireAfter ms
	temporalExpiration(now)
	{
		// TODO: Move out of this scope
		const expireAfter = this.conf.get("discardInactiveAfter");

		for(let i = this.history.length - 1; i >= 0; i--) {
			if((now - this.history[i].active) > expireAfter) {
				this.history.splice(i, 1);
			}
		}
	}

	overlapsAny(c, cAll)
	{
		for(let i = 0; i < cAll.length; i++) {
			if(this.overlaps(c, cAll[i])) {
				return cAll[i];
			}
		}

		return false;
	}

	overlaps(c1, c2)
	{
		if (c1.box[1] < c2.box[3]) return false;
		if (c2.box[1] < c1.box[3]) return false;

		if (c1.box[2] < c2.box[0]) return false;
		if (c2.box[2] < c1.box[0]) return false;

		return true;
	}


	// is rect within another rect in set?
	isWithin(rect, rectSet, ignoreIndex)
	{
		for(let i = 0; i < rectSet.length; i++) {
			if(i === ignoreIndex) {
				continue;
			}
			if(rect.box[0] >= rectSet[i].box[0] 		// > top
				&& rect.box[2] <= rectSet[i].box[2] 	// < bottom
				&& rect.box[3] >= rectSet[i].box[3]		// > left
				&& rect.box[1] <= rectSet[i].box[1])	// < right
			{
				return true;
			}
		}

		return false;
	}

}

exports.default = MvrProcessor;
exports.MvrFilterFlags = MvrFilterFlags;
