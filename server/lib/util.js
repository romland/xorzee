class Util
{
// let vectorLines = Math.floor( this.conf.get("height") / 16) + 1;
// let vectorsPerLine = Math.floor( this.conf.get("width") / 16) + 1;
	static getVecHeight(h)
	{
		return Math.floor( h / 16) + 1;
		//return Math.floor( h / 16);
		//return ( h / 16);
	}

	static getVecWidth(w)
	{
		return Math.floor( w / 16) + 1;
	}
}

module.exports = Util;

