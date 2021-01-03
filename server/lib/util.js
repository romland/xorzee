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

		fs.writeFileSync(fileName, JSON.stringify(data, null, 4));

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

		logger.debug("scalePolygin(): width ratio: %d, height ratio: %d", wr, hr);

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

    // string or array rgb
	static rgbToYuv(rgb)
	{
		if(typeof rgb === "string") {
			rgb = Util.hexStrToArr(rgb);
		}

		return [
			0.257 * rgb[0] + 0.504 * rgb[1] + 0.098 * rgb[2] + 16,   // Y
			-0.148 * rgb[0] - 0.291 * rgb[1] + 0.439 * rgb[2] + 128, // U
			0.439 * rgb[0] - 0.368 * rgb[1] - 0.071 * rgb[2] + 128   // V
		];
	}

	// string or array rgb
	static rgbToVuy(rgb)
	{
		if(typeof rgb === "string") {
			rgb = Util.hexStrToArr(rgb);
		}

		return [
			0.439 * rgb[0] - 0.368 * rgb[1] - 0.071 * rgb[2] + 128,   // V
			-0.148 * rgb[0] - 0.291 * rgb[1] + 0.439 * rgb[2] + 128,  // U
			0.257 * rgb[0] + 0.504 * rgb[1] + 0.098 * rgb[2] + 16,    // Y
		];
	}

	static arrToHexStr(arr)
	{
		return "0x" + Buffer.from(arr).toString("hex").toUpperCase();
	}

	// rgb str e.g.: ff00ff
	static hexStrToArr(str)
	{
		if(str.length !== 6) {
			logger.error("Invalid hex str %s", str);
			return [0,0,0];
		}

		let arr = [];
		for(let c = 0; c < str.length; c += 2) {
			arr.push(
				parseInt(str.substr(c, 2), 16)
			);
		}

		return arr;
	}

	// string or array rgb
	static isBright(rgb)
	{
		if(typeof rgb === "string") {
			rgb = Util.hexStrToArr(rgb);
		}

		return Util.getLuminance(rgb) > 125;
	}

	// string or array rgb
	static getLuminance(rgb)
	{
		if(typeof rgb === "string") {
			rgb = Util.hexStrToArr(rgb);
		}

		return Math.round(((parseInt(rgb[0]) * 299) +
			(parseInt(rgb[1]) * 587) +
			(parseInt(rgb[2]) * 114)) / 1000);
	}
}

module.exports = Util;

