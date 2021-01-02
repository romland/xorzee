const fetch = require('node-fetch');
const StandardSignal = require("./StandardSignal").default;

class Fetch extends StandardSignal
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
		super.start(`Starting signal '${this.signal.name}'; fetch ${this.signal.args}`);

		let respText;
		const body = {
			signalType : signalType,
			signal : this.signal,
			signalData : signalData
		};

		try {
			const response = await fetch(this.signal.args, {
				method: 'post',
				body: JSON.stringify(body),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if(!response.ok) {
				this.error(`${response.status} ${response.statusText}`);
			}

			respText = await response.text();

		} catch(ex) {
			this.error(`StandardSignal Fetch exception: ${ex}`);
		}

		this.done(respText);
	}
}

exports.default = Fetch;
