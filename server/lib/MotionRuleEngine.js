"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class MotionRuleEngine
{
	constructor(conf, motionListener)
	{
		this.conf = conf;
		this.motionListener = motionListener;
	}


	start()
	{
		logger.info("Motion rule engine started...");
	}


/*
            // TODO:
            startRecordRequirements : {
                activeTime          : 2000          // ms
                minFrameMagnitude   : 0,
                minBlocks           : 0,
                // ability to specify area
                // ability to specify min AND max density
            },

            stopRecordRequirements : {
                stillTime           : 3000,
                maxFrameMagnitude   : 0,
                maxRecordTime       : 0,            // + what is buffered
                minRecordTime       : 0,            // - what is buffered

            },

            // TODO: Used to trigger external programs (such as sound a bell or send a text)
            signalRequirements : {
                minInterval         : 10000,
                // use startrecordrequirements unless specified
            },
*/

}

exports.default = MotionRuleEngine;
