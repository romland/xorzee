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
}

module.exports = Util;

