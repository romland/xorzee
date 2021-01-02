// Interface of a Standard Signal
class StandardSignal
{
	constructor(signalConfig, onStart, onDone, onError)
	{
		this.onStart = onStart;
		this.onDone = onDone;
		this.onError = onError;
	}

	done(message)
	{
		this.onDone(message);
	}

	start(message)
	{
		this.onStart(message);
	}

	error(message)
	{
		this.onError(message);
	}
}

exports.default = StandardSignal;
