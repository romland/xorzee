"use strict";

const cp = require('child_process');
const tkill = require('tree-kill');
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const Signals = {
	ACTIVE_FRAME	: 1,
	ACTIVE_PERIOD	: 2,	// XXX: Not implemented ... yet
	STATIC_PERIOD	: 4,	// XXX: Not implemented ... yet

	START_RECORDING	: 8,
	STOP_RECORDING	: 16
};

const StandardSignals = {
	FETCH			: 1,
	SOUND			: 2,
	EMAIL			: 3
};

class MotionSignaller
{
	constructor(conf)
	{
		this.conf = conf;
		this.signals = this.conf.get("signals");
		this.enabledSignals = this.hasEnabledSignals();;

		this.running = [];
		this.scriptErrors = {};
		this.scriptInstances = {};
		this.scriptLastExecutions = {};
	}


	start()
	{
	}


	reconfigure(conf)
	{
		this.conf = conf;
		this.signals = this.conf.get("signals");
		this.enabledSignals = this.hasEnabledSignals();;
	}


	stop()
	{
		this.killAll();
	}


	// Type is Signals.*
	activity(type)
	{
		if(this.running.length > 0) {
			this.killTheInfidels();
		}

		if(!this.enabledSignals) {
			return;
		}

		this.dispatchSignal(type);
	}


	dispatchSignal(type)
	{
		let attemptedExecutes = 0;

		let s;
		for(let i = 0; i < this.signals.length; i++) {
			s = this.signals[i];

			if(s.onEvent !== type) {
				continue;
			}

			if(!this.isExecutable(s)) {
				continue;
			}

			switch(s.execute) {
				case StandardSignals.FETCH :
					// TODO
					attemptedExecutes++;
					logger.debug("StandardSignal.FETCH triggered");
					break;

				case StandardSignals.SOUND :
					// TODO
					attemptedExecutes++;
					logger.debug("StandardSignal.SOUND triggered");
					break;

				case StandardSignals.EMAIL :
					// TODO
					attemptedExecutes++;
					logger.debug("StandardSignal.EMAIL triggered");
					break;

				default :
					attemptedExecutes++;
					logger.debug("Script signal triggered");
					this.executeScript(s);
					break;
			}
		}

		return attemptedExecutes;
	}


	hasEnabledSignals()
	{
		for(let i = 0; i < this.signals.length; i++) {
			if(this.signals[i].enabled === true) {
				return true;
			}
		}

		return false;
	}


	isExecutable(signal)
	{
		if(signal.enabled !== true) {
			return false;
		}

		if(this.scriptLastExecutions[signal.name] && (this.scriptLastExecutions[signal.name] + signal.minInterval) > Date.now()) {
			logger.debug("Script is not allowed to run due to having run too recently: %s", signal.name);
			return false;
		}

		if(this.scriptInstances[signal.name] && this.scriptInstances[signal.name] >= signal.maxInstances) {
			logger.debug("Script is not allowed to run due to exceeding max. instances: %s", signal.name);
			return false;
		}

		if(this.scriptErrors[signal.name] && this.scriptErrors[signal.name] > signal.maxErrors) {
			logger.debug("Script is not allowed to run due to exceeding max. errors: %s", signal.name);
			return false;
		}

		return true;
	}


	killTheInfidels()
	{
		let killed = 0;

		for(let i = 0; i < this.running.length; i++) {
			if(Date.now() > this.running[i].kill) {
				logger.debug("Signal running longer than allowed: %o", this.running[i].signal.name);
				this.kill(this.running[i]);
				killed++;
			}
		}

		this.purgeKilled();

		return killed;
	}

	purgeKilled()
	{
		let len = this.running.length;

		for(let i = len - 1; i >= 0; i--) {
			if(!this.running[i].killed) {
				continue;
			}

			logger.debug("Purging killed [%d] %s", this.running[i].process.pid, this.running[i].signal.name);

			this.running.splice(i, 1);
		}
	}

	killAll()
	{
		logger.debug("Killing all running signals");

		for(let i = 0; i < this.running.length; i++) {
			this.kill(this.running[i]);
		}

		this.purgeKilled();

		return true;
	}

	executeScript(signal)
	{
		let proc;

		logger.info("Executing signal script: %s", signal.name);

		if(this.scriptInstances[signal.name]) {
			this.scriptInstances[signal.name] = 0;
		} else {
			this.scriptInstances[signal.name]++;
		}

		try {
			proc = cp.spawn(
				signal.execute,
				signal.args.trim().split(","),
				{
					detached : true,
					cwd : signal.cwd,
					shell : true
				}
			);

			this.scriptLastExecutions[signal.name] = Date.now();

			proc.unref();

			const onProcessDied = (e) => {
				logger.info("Signal script '%s' is done. Exit reason: %o", signal.name, e);
				this.scriptInstances[signal.name]--;
				runObject.killed = true;
				this.purgeKilled();
			};

			const onProcessMessage = (d) => {
				logger.info("[Signal script '%s']: %s", signal.name, d);
			};

			if(signal.log) {
				proc.stdout.on('data', onProcessMessage)
				proc.stderr.on('data', onProcessMessage)
			}
			proc.on('close', onProcessDied);
			proc.on('error', onProcessDied);

		} catch(ex) {
			this.scriptInstances[signal.name]--;

			if(!this.scriptErrors[signal.name]) {
				this.scriptErrors[signal.name] = 0;
			}

			this.scriptErrors[signal.name]++;
			logger.error("Exception #%d running external script '%s': %o", this.scriptErrors[signal.name], signal.name, ex);
			return null;
		}

		if(this.scriptErrors[signal.name]) {
			this.scriptErrors[signal.name] = 0;
		}

		let runObject = {
			"signal" : signal,
			"kill" : Date.now() + signal.maxRunTime,
			"process" : proc,
			"killed" : false
		};

		this.running.push(runObject);



		return proc.pid;
	}


	kill(runningObject)
	{
		let proc = runningObject.process;

		logger.info("Forcefully killing process PID %d. Signal: %s", proc.pid, runningObject.signal.name);

		proc.stdin.pause();
		tkill(proc.pid);

		runningObject.killed = true;

		this.scriptInstances[runningObject.signal.name]--;

		// Well, we don't know. Do a check if it really is dead? Fine for now. Revisit if needed.
		return true;
	}
}

exports.default = MotionSignaller;
exports.Signals = Signals;
exports.StandardSignals = StandardSignals;

