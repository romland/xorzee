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
		app.use((req, res, next) => {
			res.append('Access-Control-Allow-Origin', ['*']);
			res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.append('Access-Control-Allow-Headers', 'Content-Type');
			next();
		});
        app.use(express.static( this.conf.get("publicPath") ));

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

        app.listen(this.conf.get('wwwPort'), () => {
            logger.info("Listening for HTTP requests on port %d", this.conf.get('wwwPort'));
        });
	}
}

exports.default = WebServer;

