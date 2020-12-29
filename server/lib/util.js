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

}

module.exports = Util;

