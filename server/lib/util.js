const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const fs = require("fs");


class Util
{
// let vectorLines = Math.floor( this.conf.get("height") / 16) + 1;
// let vectorsPerLine = Math.floor( this.conf.get("width") / 16) + 1;
	static getVecHeight(h)
	{
		if((h % 16) === 0) {
			return Math.floor( h / 16);			// works on 1280x720	- 720 / 16 = 45
												// works on 640x480		- 480 / 16 = 30
		} else {
			return Math.floor( h / 16) + 1;		// works on 1920x1080	- 1080 / 16 = 67.5
												// works on 640x600		- 600 / 16 = 37.5
		}
	}


	static getVecWidth(w)
	{
		return Math.floor( w / 16) + 1;
	}


	static savePartialSettings(fileName, settings)
	{
		let data = JSON.parse( fs.readFileSync(fileName, "utf8") );

		for(let s in settings) {
			data[s] = settings[s];
		}

		fs.writeFileSync(fileName, JSON.stringify(data));

		logger.debug("Wrote %s with partial settings: %o", fileName, settings);
		return true;
	}


	static pointIsInPoly(p, polygon)
	{
		var isInside = false;
		var minX = polygon[0].x, maxX = polygon[0].x;
		var minY = polygon[0].y, maxY = polygon[0].y;

		var q;
		for(var n = 1; n < polygon.length; n++) {
			q = polygon[n];
			minX = Math.min(q.x, minX);
			maxX = Math.max(q.x, maxX);
			minY = Math.min(q.y, minY);
			maxY = Math.max(q.y, maxY);
		}

		if(p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
			return false;
		}

		var i = 0, j = polygon.length - 1;
		for (i, j; i < polygon.length; j = i++) {
			if ( (polygon[i].y > p.y) != (polygon[j].y > p.y) &&
				p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
				isInside = !isInside;
			}
		}

		return isInside;
	}


	static scalePolygon(polygon, currentResolution, targetResolution, roundToNearest = 16, copy = false)
	{
		let wr = targetResolution.width / currentResolution.width;
		let hr = targetResolution.height / currentResolution.height;

		logger.info("scalePolygin(): width ratio: %d, height ratio: %d", wr, hr);

		let p;

		if(copy) {
			p = polygon.map( (n) => {
				return { x: n.x, y: n.y };
			});

		} else {
			p = polygon;
		}

		for(let i = 0; i < p.length; i++) {
			if(roundToNearest > 0) {
				p[i].x *= wr;
				p[i].y *= hr;
			} else {
				// Rounds to nearest N and 0 decimals
				p[i].x = Math.round(
					Math.round( (p[i].x * wr) / roundToNearest) * roundToNearest
				);
				p[i].y = Math.round(
					Math.round( (p[i].y * hr) / roundToNearest) * roundToNearest
				);
			}
		}

		return p;
	}

}

module.exports = Util;

