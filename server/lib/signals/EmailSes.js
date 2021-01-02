var ses = require('node-ses');
const StandardSignal = require("./StandardSignal").default;
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class EmailSes extends StandardSignal
{
	constructor(signalConfig, onStart, onDone, onError, conf)
	{
		super(signalConfig, onStart, onDone, onError);
		this.signal = signalConfig;
		this.conf = conf;

		if( (!process.env.AWS_ACCESS_KEY_ID && !conf.get("sendMailSES").key)
			|| (!process.env.AWS_SECRET_ACCESS_KEY && !conf.get("sendMailSES").secret)) {
			logger.error("Cannot send Email using SES as there is no key and/or secret defined");
			return;
		}

		this.client = ses.createClient({
			key		: process.env.AWS_ACCESS_KEY_ID || conf.get("sendMailSES").key,
			secret	: process.env.AWS_SECRET_ACCESS_KEY || conf.get("sendMailSES").secret,
			amazon	: conf.get("sendMailSES").amazon
		});
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
		if(!this.client) {
			this.error("Cannot send SES email as we do not have a client (probably because key/secret was not set");
			return;
		}

		super.start(`Starting signal '${this.signal.name}'; email ${JSON.stringify(this.signal.args)}`);

		let result;
		let that = this;

		try {
			// Do the action for the signal...
			this.client.sendEmail({
				   to: this.signal.args.to
				 , from: this.signal.args.from
				 , subject: this.signal.args.subject
				 , message: 'your <b>message</b> goes here'
				 , altText: 'plain text'
			}, function (err, data, res) {
				if(that.signal.log) {
					logger.info(data);
				}

				if(err) {
					that.error(err);
					that.error(err.stack);
					return;
				}

				that.done(res);
			});

		} catch(ex) {
			this.error(`StandardSignal Email exception: ${ex}`);
		}
	}
}

exports.default = EmailSes;
