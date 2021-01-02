const StandardSignal = require("./StandardSignal").default;

class Example extends StandardSignal
{
	constructor(signalConfig, onStart, onDone, onError)
	{
		super(signalConfig, onStart, onDone, onError);
		this.signal = signalConfig;
	}

	done(message)
	{
		super.done(message);
	}

	error(message)
	{
		super.error(message);
	}

	async start(signalType, signalData)
	{
		super.start(`Starting signal '${this.signal.name}'; email ${this.signal.args}`);

		let result;

		try {

			// Do the action for the signal...

			example = "result from action taken";

		} catch(ex) {
			this.error(`StandardSignal Example exception: ${ex}`);
		}

		this.done(result);
	}
}

exports.default = Example;
