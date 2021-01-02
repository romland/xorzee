const sendmail = require('sendmail')();
const StandardSignal = require("./StandardSignal").default;
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class Email extends StandardSignal
{
	constructor(signalConfig, onStart, onDone, onError, conf)
	{
		super(signalConfig, onStart, onDone, onError);
		this.signal = signalConfig;

		this.conf = conf;
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
		super.start(`Starting signal '${this.signal.name}'; email ${JSON.stringify(this.signal.args)}`);

		let result;

		try {
			// Do the action for the signal...
			await sendmail(
				{
					from	: this.signal.args.from.trim(),
					to		: this.signal.args.to.trim(),
					subject	: this.signal.args.subject.trim(),
					// TODO:
					html	: 'TODO: Standard body goes here!',
				}, (err, reply) => {
					this.error(err && err.stack);
				}
			);
			result = "Done maybe";

		} catch(ex) {
			this.error(`StandardSignal Email exception: ${ex}`);
		}

		this.done(result);
	}
}

exports.default = Email;
