"use strict";
const express = require('express');
const app = express();
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class WebServer
{
	constructor(conf)
	{
		this.conf = conf;
	}

	start()
	{
        app.use(express.static( this.conf.get("publicpath") ));

        app.get('/', (req, res) => {
            var count = 0;

            wsServer.clients.forEach((ws) => {
                if (ws.readyState == 1) {
                    count++;
                }
            })

            res.set('Content-type', 'text/plain');
            res.send(count.toString());
        });

        app.listen(this.conf.get('wwwport'), () => {
            logger.info("Listening for HTTP requests on port %d", this.conf.get('wwwport'));
        });
	}
}

exports.default = WebServer;

