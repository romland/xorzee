/**
 * Send motion stream (and messages) to websocket clients.
 */

"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
//const WebSocket = require('@clusterws/cws');
const WebSocket = require('ws');

class MotionSender
{
	constructor(conf)
	{
		this.conf = conf;
		this.motionWsServer = null;
	}

	broadcastRaw(data, len, binary = true)
	{
		this.motionWsServer.clients.forEach((ws) => {
			if (ws.readyState === 1) {
				ws.send(data, { binary: binary });
			}
		});
	}

	broadcastMessageStr(str)
	{
		this.broadcastRaw(str, str.length, false);
	}

	broadcastMessage(ob)
	{
		let str = JSON.stringify(ob);
		this.broadcastRaw(str, str.length, false);
	}

	start(welcomeMessage, controlHandler)
	{
		this.motionWsServer = new WebSocket.Server({ port: this.conf.get('motionWsPort') });
		logger.info( "Motion sender websocket server listening on %d", this.conf.get('motionWsPort') );

		this.motionWsServer.on('connection', (ws) => {
			if (this.motionWsServer.clients.size >= this.conf.get('wsClientLimit')) {
				logger.info('Motion client rejected, limit of %d reached', this.conf.get('wsClientLimit'));
				ws.close();
				return;
			}

			logger.info('Motion client connected. Viewers: %d', this.motionWsServer.clients.size)

			ws.send(
				JSON.stringify(welcomeMessage()),
				-1,
				false
			);

			ws.on('message', (msg) => {
				controlHandler(msg);
			});

			ws.on('close', (ws, id) => {
				logger.debug('Video client disconnected. Viewers: %d', this.motionWsServer.clients.size);
			});
		});
	}
}

exports.default = MotionSender;

