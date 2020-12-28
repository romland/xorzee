export class MotionFrame
{
	/*
	class vars
		this.width
		this.height
		this.arr
	*/
	constructor()
	{
		this.width  = 0;
		this.height = 0;
	}


	init(vecWidth, vecHeight)
	{
		this._arr = Array(vecWidth);

		// Pre-allocate the entire array of vectors. These objects will be _modified_
		// in place. To store them, you need to make a copy.
		for(let x = 0; x < this._arr.length; x++) {
			this._arr[x] = Array(vecHeight);

			for(let y = 0; y < this._arr[x].length; y++) {
				this._arr[x][y] = this.getZero(x, y); 
			}
		}

		this.width  = vecWidth;
		this.height = vecHeight;
	}


	at(x, y)
	{
		if(!this._arr) {
			return null;
		}

		if(!this._arr[x]) {
			return null;
		}

		return this._arr[x][y];
	}


	getZero(x, y)
	{
		return {
			x : x,
			y : y,
			dx : 0,
			dy : 0,
			sad : 0,
			dir : 0,
			mag : 0,
		};
	}


	_getRawAt(index, frame, outMv)
	{
		outMv.dx  = frame[index + 0] & 0x80 ? frame[index + 0] ^ -0x100 : frame[index + 0];
		outMv.dy  = frame[index + 1] & 0x80 ? frame[index + 1] ^ -0x100 : frame[index + 1];
		outMv.sad = (frame[index + 3]<<8) + frame[index + 2];
	}
	

	load(frame, frameDataWidth, frameDataHeight)
	{
		let v;
		for(let x = 0; x < frameDataWidth; x++) {
			for(let y = 0; y < frameDataHeight; y++) {
				v = this._arr[x][y];
				this._getRawAt(((y * frameDataWidth + x)*4), frame, v);

				v.dir = Math.atan2(v.dy, -v.dx) * 180 / Math.PI + 180;
				v.mag = Math.sqrt(v.dx * v.dx + v.dy * v.dy);
	
				if(v.dir === 360) {
					v.dir = 0;
				}
			}
		}
	}
}
