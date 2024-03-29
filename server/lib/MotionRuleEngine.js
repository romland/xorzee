"use strict";
/**
 * active frame = something is happening
 * static frame = nothing is happening
 */

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class MotionRuleEngine
{
	constructor(conf, mvrProcessor, videoListener, eventTriggerCallback = null)
	{
		this.conf = conf;

		this.eventTriggerCallback = eventTriggerCallback;
		this.mvrProcessor = mvrProcessor;
		this.videoListener = videoListener;
		this.recorder = videoListener.getRecorder();

		this.reconfigure(conf);

		this.trackReasons = conf.get("trackReasons");

		if(this.trackReasons) {
			this._resetReasons();
		}

		this.lastActivity = Date.now();

		this.lastRecordingStarted = 0;
		this.lastRecordingStopped = 0;

		this.cost = {
			ts : null
		};

		this.recorder.subscribeEvent("start", (data) => {
			logger.debug("MotionRuleEngine got start event");
		});

		// Stop recording is not always triggered by us, we do however want to know.
		this.recorder.subscribeEvent("stop", (data) => {
			logger.debug("MotionRuleEngine got stop event, resetting reasons and setting lastRecordingStopped = now");
			this._resetReasons();
			this.lastRecordingStopped = Date.now();
		});
	}


	reconfigure(conf)
	{
		this.startReq = conf.get("startRecordRequirements");
		this.stopReq = conf.get("stopRecordRequirements");
		this.sigReq = conf.get("signalRequirements");
	}


	isRecording()
	{
		return this.recorder.isRecording();
	}


	startRecording()
	{
		if(this.isRecording()) {
			throw new Error("Attempted to start recording while recording");
		}

		// TODO
		this.recorder.start(this.videoListener.getHeaders());

		this.lastRecordingStarted = Date.now();

		this.cost.ts = Date.now();
		this._sendEvent("start", null);
		this.cost._sendEventStartRec = Date.now() - this.cost.ts;
	}


	stopRecording()
	{
		if(!this.isRecording()) {
			throw new Error("Attempted to stop recording while not recording");
		}

		this.recorder.stop();

		this.lastRecordingStopped = Date.now();
		this._sendEvent("stop", null);
	}


	_sendEvent(type, data)
	{
		if(this.eventTriggerCallback) {
			this.eventTriggerCallback("MotionRuleEngine", type, data);
		}
	}


	start()
	{
		logger.debug("Motion rule engine started...");
	}


	processFrame()
	{
		if(this.recorder.isManuallyRecording()) {
			// No need to execute motion rules if we are manually recording
			return;
		}
		
		this.cost = {
			ts : Date.now()
		};

		this._resetReasons();
		this.cost.reset = Date.now() - this.cost.ts;

		this.cost.ts = Date.now();
		const cs = this.mvrProcessor.getActiveClusters();
		this.cost.getActive = Date.now() - this.cost.ts;

		this.cost.ts = Date.now();
		const active = this.isActiveFrame(cs)
		this.cost.isActiveFrame = Date.now() - this.cost.ts;

		if(active) {
			this.cost.ts = Date.now();
			const fi = this.mvrProcessor.getFrameInfo();
			this._sendEvent("activity", fi);
			this.cost.sendActivity = Date.now() - this.cost.ts;
		}

		if(!this.isRecording()) {
			// Should we start recording?
			if(active) {
				this.cost.ts = Date.now();
				if(this.isActivePeriod(cs)) {
					this.startRecording();
					this.cost.startRecording = Date.now() - this.cost.ts;
					return;
				}
				this.cost.isActivePeriod = Date.now() - this.cost.ts;
			} else if(this.trackReasons) {
				logger.debug("[not recording] Deemed frame static because: %s", this._getBriefReasons());
			}

		} else {
			// Should we stop recording?

			// minRecordTime
			this.cost.ts = Date.now();
			if(this.stopReq.minRecordTime > (Date.now() - this.lastRecordingStarted)) {
				if(this.trackReasons) {
					this._addReason("minRecordTime", false);
					logger.debug("[recording] Deemed frame active because: %s %d", this._getBriefReasons(), ((Date.now() - this.lastRecordingStarted)) );
				}

				return;
			}
			this.cost.minRecordTimeCheck = Date.now() - this.cost.ts;

			// maxRecordTime
			if(this.stopReq.maxRecordTime < (Date.now() - this.lastRecordingStarted)) {
				logger.debug("Stopping because maxRecordTime was exceeded");
				this.cost.ts = Date.now();
				this.stopRecording();
				this.cost.stopRecording = Date.now() - this.cost.ts;
				return;
			} else { 
				if(this.trackReasons) this._addReason("maxRecordTime", false);
			}

			if(this.isStaticFrame(cs)) {

				if(this.isStaticPeriod()) {
					this.cost.ts = Date.now();
					this.stopRecording();
					this.cost.stopRecording2 = Date.now() - this.cost.ts;
				}
			} else if(this.trackReasons) {
				logger.debug("[recording] Deemed frame active because: %s", this._getBriefReasons());
			}

		}
	}


	_resetReasons()
	{
		if(!this.reasons) {
			this.reasons = {};
		}

		// Both
		this.reasons.nullFrame = null;

		// isActiveFrame
		this.reasons.minInterval = null;
		this.reasons.minFrameMagnitude = null;
		this.reasons.activeTime = null;
		this.reasons.minActiveBlocks = null;
		this.reasons.activePeriod = null;

		// isStaticFrame
		this.reasons.maxFrameMagnitude = null;
		this.reasons.stillTime = null;
		this.reasons.staticPeriod = null;
		this.reasons.maxRecordTime = null;
		this.reasons.minRecordTime = null;
	}


	/**
	 * Keep track of whether a condition is met, this 
	 * is handy for setting up the rules.
	 *
	 * XXX: This _could_ be passed to client
	 *
	 * Think: if a reason is set to 'false', it means 
	 * it prevented start/stop recording from happening.
	 */
	_addReason(reason, val)
	{
		if(this.reasons[reason] === undefined) {
			throw new Error("Reason not added to collection: " + reason);
		}
		this.reasons[reason] = val;
	}


	// Debug.
	_getBriefReasons()
	{
		let str = "";

		for(let r in this.reasons) {
			if(this.reasons[r] !== null) {
				if(str.length > 0) {
					str += ", ";
				}
				str += r + "=" + this.reasons[r];
			}
		}
		return str;
	}


	/**
	 * Think: "Should we start recording?"
	 */
	isActiveFrame(cs)
	{
		// minInterval (don't restart if we just stopped)
		if(Date.now() < (this.lastRecordingStopped + this.startReq.minInterval)) {
			if(this.trackReasons) this._addReason("minInterval", false);
			return false;
		}

		let fi = this.mvrProcessor.getFrameInfo();

		// nullFrame
		if(fi.nullFrame) {
			if(this.trackReasons) this._addReason("nullFrame", false);
			return false;
		}

		// minFrameMagnitude
		if(fi.totalMagnitude < this.startReq.minFrameMagnitude) {
			if(this.trackReasons) this._addReason("minFrameMagnitude", false);
			return false;
		}

		// minActiveBlocks
		if(fi.candidates < this.startReq.minActiveBlocks) {
			if(this.trackReasons) this._addReason("minActiveBlocks", false);
			return false;
		}

		return true;
	}


	isActivePeriod(cs)
	{
		// activeTime
		if(!this.hasActiveClusters(cs, this.startReq.activeTime)) {
			if(this.trackReasons) this._addReason("activePeriod", false);
			return false;
		}

		logger.debug("Active period detected");
		return true;
	}


	hasActiveClusters(cs, minAge)
	{
		for(let i = 0; i < cs.length; i++) {
			if(	cs[i].age >= minAge) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Think: "Should we stop recording?"
	 */
	isStaticFrame(cs)
	{
		let fi = this.mvrProcessor.getFrameInfo();

		// nullFrame: Don't stop recording on them
		// 04nov2021: Why? I think I might want to...
		// if(fi.nullFrame) {
		// 	if(this.trackReasons) this._addReason("nullFrame", false);
		// 	return false;
		// }

		// maxFrameMagnitude
		if(this.stopReq.maxFrameMagnitude > 0 && fi.totalMagnitude >= this.stopReq.maxFrameMagnitude) {
			// Deem this frame 'active'
			this.lastActivity = Date.now();

			if(this.trackReasons) this._addReason("maxFrameMagnitude", false);
			return false;
		}

		// Do we have activity?
		if(this.hasActiveClusters(cs, this.stopReq.stillTime)) {
			// Deem this frame 'active'
			this.lastActivity = Date.now();

			if(this.trackReasons) this._addReason("stillTime", false);
			return false;
		}

		// if we get here, it means 'inactivity time is ticking' (this was not a static frame)
		return true;
	}


	isStaticPeriod()
	{
		// lastActivity
		if((Date.now() - this.lastActivity) > this.stopReq.stillTime) {
			if(this.trackReasons) this._addReason("staticPeriod", false);
			return false;
		}

		logger.debug("Static period detected");
		return true;
	}
}

exports.default = MotionRuleEngine;
