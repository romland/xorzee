/////////////////////////////////////////////
// Local Functions
/////////////////////////////////////////////

/**
 * Fetches a vector from the raw frame data, refines it by calculating
 * direction and magnitude and then puts the data in 'outMv'.
 */
function getVectorAt(index, frame, outMv) {
	outMv.dx  = frame[index + 0] & 0x80 ? frame[index + 0] ^ -0x100 : frame[index + 0];
	outMv.dy  = frame[index + 1] & 0x80 ? frame[index + 1] ^ -0x100 : frame[index + 1];
	outMv.sad = (frame[index + 3]<<8) + frame[index + 2];
}


/////////////////////////////////////////////
// Main Class
/////////////////////////////////////////////

class VectorsFrame {

	constructor() {
		this.width  = 0;
		this.height = 0;
	}


	/**
	 * Temp access to internal data, to make transition to this type easier.
	 *
	 * In due time, this should be gotten rid of.
	  */
	arr() { return this._arr; }


	at(x, y) {
		if (!this._arr) return null;
		if (!this._arr[x]) return null;

		return this._arr[x][y];
	}


	init(vecWidth, vecHeight) {
		//console.log("Initializing VectorsFrame instance");
		this._init_bare(vecWidth, vecHeight); 
	}


	_zero_vec(x, y) {
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


	_init_bare(vecWidth, vecHeight) {
		this._arr = Array(vecWidth);

		// Pre-allocate the entire array of vectors. These objects will be _modified_
		// in place. To store them, you need to make a copy.
		for(let x = 0; x < this._arr.length; x++) {
			this._arr[x] = Array(vecHeight);
			for(let y = 0; y < this._arr[x].length; y++) {
				this._arr[x][y] = this._zero_vec(x, y); 
			}
		}

		this.width  = vecWidth;
		this.height = vecHeight;
	}


	/**
	 * Get all vectors in the frame and throw them in a pre-allocated 2D array.
	 */
	loadFrame(frame, frameDataWidth, frameDataHeight) {
		// Init local instance if not already done so
		if (this.width == 0) {
			this._init_bare(frameDataWidth, frameDataHeight);
		}

		for(let x = 0; x < frameDataWidth; x++) {
			for(let y = 0; y < frameDataHeight; y++) {
				getVectorAt(((y * frameDataWidth + x)*4), frame, this._arr[x][y]);
			}
		}

		this.recalc();
	}


	/*
		DO NOT USE
		==========
		You don't want to use this! It's here simply to test remapping
		of fisheye distortion.
		This operation incurs a DATA LOSS on some regions of the field of 
		view, and duplicate data in others. The use of remapping is to 
		estimate object size and object location.
		There could be other uses?
	*/
	loadFrameRemapped(frame, frameDataWidth, frameDataHeight, space) {
		// Init local instance if not already done so
		if (this.width == 0) {
			this._init_bare(frameDataWidth, frameDataHeight);
		}

		let remapped;
		for(let x = 0; x < frameDataWidth; x++) {
			for(let y = 0; y < frameDataHeight; y++) {
				remapped = space.remapPointInverseClamped(x, y);
				if(remapped[0] === null) {
					continue;
				}
				getVectorAt(((y * frameDataWidth + x)*4), frame, this._arr[remapped[0]][remapped[1]]);
			}
		}

		this.recalc();
	}


	/**
	 * Copy over values in param 'data'
	 *
	 * This is a deep copy, not just reference copying.
	 * New internal vector instances are created to store the data
	 *
	 * Assumption: param 'data' is a VectorsFrame instance with the same dimensions
	 */
	copyFrom(data) {
		// Init local instance if not already done so
		if (this.width == 0) {
			this._init_bare(data.width, data.height);
		}

		for(let x = 0; x < data.width; x++) {
			for(let y = 0; y < data.height; y++) {
				let vec = data.arr()[x][y];

				this._arr[x][y].x   = vec.x;
				this._arr[x][y].y   = vec.y;
				this._arr[x][y].dx  = vec.dx;
				this._arr[x][y].dy  = vec.dy;
				this._arr[x][y].sad = vec.sad;
				this._arr[x][y].dir = vec.dir;
				this._arr[x][y].mag = vec.mag;
			}
		}
	}


	/**
	 * Iterate over all vectors and perform an operation on them
	 */
	each_vector(fun) {
		if (this._arr) {
			for(let x = 0; x < this.width; x++) {
				for(let y = 0; y < this.height; y++) {
					fun((this._arr[x][y]));
				}
			}
		}
	}


	/**
	 * (Re)calculate the derived parameters for all vectors
	 */
	recalc() {
		this.magnitude = 0;
		this.SAD = 0;

		this.each_vector((v) => {
			v.dir = Math.atan2(v.dy, -v.dx) * 180 / Math.PI + 180;
			v.mag = Math.sqrt(v.dx * v.dx + v.dy * v.dy);

			// I spell this one out because it could be deemed 'dangerous' at some point.
			if(v.dir === 360) {
				v.dir = 0;
			}
	
			this.magnitude += v.mag;
			this.SAD += v.sad;
		});
	}


	clear_vec(x, y) {
		let v = null
		if (y == undefined) {
			v = x;  // Assuming that x is a vector
		} else {
			v = this._arr()[x][y];
		}

		v.dx = 0;
		v.dy = 0;
		v.sad = 0;
		v.dir = 0;
		v.mag = 0;
	}


	/**
	 * Return array with direct neighbors for given vector
	 */
	neighbors(v) {
		// Don't bother with vectors on the edges
		if (v.x == 0 || v.y == 0 || v.x == (this.width -1) || v.y == (this.height -1)) return null;

		let ret = [
			this._arr[v.x - 1][v.y],
			this._arr[v.x + 1][v.y],
			this._arr[v.x][v.y - 1],
			this._arr[v.x][v.y + 1]
		];

		return ret;
	}
}
