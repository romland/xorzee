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

	snapshotDispmanx(fileName)
	{
        logger.info(`Taking snapshot of dispmanx layer as %s`, fileName);

        const spawn = cp.spawn('/home/dev/tmp/streamtest/raspi2png/raspi2png', [
            '--pngname', `${this.conf.get("recordPath")}/${fileName}`,
			// '--height', '640',
			'--width', '720',
			'--compression', '1',
			'--delay', '0',
			'--display', '0'
        ]);

        spawn.on('close', function(code) {
            logger.debug('Snapshot done, code: %d', code);
        });

		return fileName;
	}

	/* 
	 * testing:
	 * /usr/bin/ffmpeg -y -hide_banner -i 1637632174790.h264 -frames:v 1 -f image2 snapshot.jpg
	 * http://192.168.178.101:8080/clips/snapshot.jpg
	 * 
	 * Note to self:
	 * I cannot figure out how to get ffmpeg to seek h264 files with -ss options. 
	 * It's not straight-forward for ffmpeg to do it since it needs to find keyframes,
	 * but eh, what I read indicates that it should be possible.
	 * 
	 * e.g. /usr/bin/ffmpeg -y -hide_banner -ss 00:00:10 -i 1637632174790.h264 -frames:v 1 -f image2 snapshot.jpg
	 * gives: 1637632174790.h264: could not seek to position 10.000
	 * 
	 * TODO: Will need to find some way to take snapshots.
	 */
	start(fileName)
	{
        logger.info(`Taking screenshot of video as %s.jpg`, fileName);

        let tmpFfmpeg = cp.spawn('/usr/bin/ffmpeg', [
            '-y',
            '-hide_banner',
            '-i', this.conf.get("recordPath") + "/" + fileName + '.h264',
            '-frames:v', '1',
            '-f', 'image2',
            `${this.conf.get("recordPath")}/${fileName}.jpg`
        ]);

        tmpFfmpeg.on('close', function(code) {
            logger.debug('Screenshot done, code: %d', code);
        });

		return fileName;
	}
}

exports.default = VideoScreenshotter;

