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
	}

	getClientCount()
	{
		return this.wsServer.clients.length;
	}

	broadcast(data)
	{
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

	start()
	{
        //wsServer = new WSServer({ port: conf.get('wsport') })
        this.wsServer = new WebSocket.WebSocketServer({ port: this.conf.get('wsport') });
        logger.info( "Video sender websocket server listening on %d", this.conf.get('wsport') );

        this.wsServer.on('connection', (ws) => {
			if(!this.headers) {
				throw new Error("VideoListener must have set headers in VideoSender at some point before we get connection");
			}

            if(this.wsServer.clients.length >= this.conf.get('limit')) {
                logger.info('Video client rejected, limit reached');
                ws.close();
                return;
            }

            logger.info('Video client connected, watching %d', this.wsServer.clients.length)

            for (let i in this.headers) {
                ws.send(this.headers[i]);
            }

            ws.on('close', (ws, id) => {
                logger.debug('Video client disconnected, watching %d', this.wsServer.clients.length);
            })
        });
	}
}

exports.default = VideoSender;

