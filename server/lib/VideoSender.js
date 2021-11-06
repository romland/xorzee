/**
 * VideoSender passes video stream to clients over websocket
 */

"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
//const WebSocket = require('@clusterws/cws');
const WebSocket = require('ws');


class VideoSender
{
	constructor(conf)
	{
		this.conf = conf;

		this.wsServer = null;
		this.headers = null;
		this.lastActive = Date.now();

		if(!conf.get("streamVideo")) {
			logger.info("Video streaming is disabled by configuration");
		}
	}

	getClientCount()
	{
		return this.wsServer.clients.size;
	}

	/*
	 * Incoming data is _one_ NAL unit _without_ separator.
	 */
	broadcast(data)
	{
		if(!this.conf.get("streamVideo")) {
			return;
		}

		// TODO: Make 2000 configurable when I figure out a good name for it
		if(this.conf.get("onlyActivity") && Date.now() > (this.lastActive + 2000)) {
			return;
		}

		this.wsServer.clients.forEach((ws) => {
			if(ws.readyState === WebSocket.OPEN) {
				ws.send(data, { binary: true });
			}
		});
	}

	setHeaders(h)
	{
		this.headers = h;
	}


	setActive()
	{
		this.lastActive = Date.now();
	}


	start()
	{
		//wsServer = new WSServer({ port: conf.get('videoWsPort') })
		this.wsServer = new WebSocket.Server({ port: this.conf.get('videoWsPort') });
		logger.info( "Video sender websocket server listening on %d", this.conf.get('videoWsPort') );

		this.wsServer.on('connection', (ws) => {
			ws.on('close', (ws, id) => {
				logger.debug('Video client disconnected. Viewers: %d', this.wsServer.clients.size);
			});

			if(!this.headers) {
				throw new Error("VideoListener must have set headers in VideoSender at some point before we get connection");
			}

			if(this.wsServer.clients.size >= this.conf.get('wsClientLimit')) {
				logger.info('Video client rejected, limit of %d reached', this.conf.get('wsClientLimit'));
				ws.close();
				return;
			}

			logger.info('Video client connected. Viewers: %d', this.wsServer.clients.size)

			for (let i in this.headers) {
				ws.send(this.headers[i]);
			}

			// We always want to send a little (few seconds) when a new client connects
			if(this.conf.get("onlyActivity")) {
				this.setActive();
			}
		});
	}
}

exports.default = VideoSender;
