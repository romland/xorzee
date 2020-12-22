"use strict";

const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const cp = require('child_process');

class VideoScreenshotter
{
	constructor(conf)
	{
		this.conf = conf;
	}

	start(fileName)
	{
        logger.info(`Taking screenshot of video as %s.jpg`, fileName);

        let tmpFfmpeg = cp.spawn('/usr/bin/ffmpeg', [
            '-y',
            '-hide_banner',
            '-i', this.conf.get("recordpath") + "/" + fileName + '.h264',
            '-frames:v', '1',
            '-f', 'image2',
            `${this.conf.get("recordpath")}/${fileName}.jpg`
        ]);

        tmpFfmpeg.on('close', function(code) {
            logger.debug('Screenshot done, code: %d', code);
        });

		return fileName;
	}
}

exports.default = VideoScreenshotter;

