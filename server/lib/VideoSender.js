/**
 * VideoSender passes video stream onto clients over websockets
 */

"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const WebSocket = require('@clusterws/cws');

class VideoSender
{
	constructor(conf)
	{
		this.conf = conf;

		this.wsServer = null;
		this.headers = null;
		this.lastActive = Date.now();
	}

	getClientCount()
	{
		return this.wsServer.clients.length;
	}

	broadcast(data)
	{
		if(this.conf.get("onlyActivity") && Date.now() > (this.lastActive + 2000)) {
			return;
		}

        this.wsServer.clients.forEach((ws) => {
            if (ws.readyState === 1) {
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
        //wsServer = new WSServer({ port: conf.get('videowsport') })
        this.wsServer = new WebSocket.WebSocketServer({ port: this.conf.get('videowsport') });
        logger.info( "Video sender websocket server listening on %d", this.conf.get('videowsport') );

        this.wsServer.on('connection', (ws) => {
			if(!this.headers) {
				throw new Error("VideoListener must have set headers in VideoSender at some point before we get connection");
			}

            if(this.wsServer.clients.length >= this.conf.get('wsclientlimit')) {
                logger.info('Video client rejected, limit of %d reached', this.conf.get('wsclientlimit'));
                ws.close();
                return;
            }

            logger.info('Video client connected. Viewers: %d', this.wsServer.clients.length)

            for (let i in this.headers) {
                ws.send(this.headers[i]);
            }

			// We always want to send a little when a new client connects
			this.setActive();

            ws.on('close', (ws, id) => {
                logger.debug('Video client disconnected. Viewers: %d', this.wsServer.clients.length);
            })
        });
	}
}

exports.default = VideoSender;

