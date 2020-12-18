"use strict";
// here
// consider: https://code.jquery.com/jquery-3.5.1.slim.min.js

// overlay_setup(width, height, fps);
// overlay_render(msg.data);


// want to save last 'actions' as a thumbnail ...


//let stream = container.getElementsByTagName("canvas")[0];
class Overlay
{
	/*
		this.overlayCanvas
	*/
	constructor()
	{
		console.log("overlay constructor called");
	}

	init(width, height, fps)
	{
		if(!this.overlayCanvas) {
			let streamCanvas = document.querySelector("#container > canvas:first-of-type");
			let streamRect = streamCanvas.getBoundingClientRect();

			let container = document.getElementById("container");
			let overlayCanvas = document.createElement("canvas");
			let overlayId = `overlay${Date.now()}`;
			overlayCanvas.id = overlayId;
			overlayCanvas.style.position = "absolute";
			overlayCanvas.style.zIndex = 10;
			overlayCanvas.style.left = streamRect.left + "px";
			overlayCanvas.style.top = streamRect.top + "px";
			overlayCanvas.style.width = streamRect.width + "px";
			overlayCanvas.style.height = streamRect.height + "px";

			container.appendChild(overlayCanvas);

			this.overlayCanvas = overlayCanvas;
		}

		let frameDataHeight = Math.floor( height / 16) + 1;
		let frameDataWidth = Math.floor( width / 16) + 1;

		let cvRatio = 0;			// Ratio of canvas' pixel-width to number-of-vectors' width.
		let canvas, context, canvasWidth, canvasHeight, imageData;
		let offScreenBuf8, offScreenBuf;

		canvas = this.overlayCanvas;
		context = canvas.getContext("2d");

		// For now, just do 1:1 ratio.

//canvasWidth = frameDataWidth * 16;
//canvasHeight = frameDataHeight * 16;

canvasWidth = frameDataWidth * 8;
canvasHeight = frameDataHeight * 8;

//canvasWidth = frameDataWidth * 2;
//canvasHeight = frameDataHeight * 2;

		// At some point we could allow both x and y ratio. Later.
		cvRatio = frameDataWidth / canvasWidth;
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		// This will help with rendering canvas faster.
		context.imageSmoothingEnabled = false;
		imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
		let buf = new ArrayBuffer(imageData.data.length);
		offScreenBuf8 = new Uint8ClampedArray(buf);
		offScreenBuf = new Uint32Array(buf);


		this.frameDataWidth = frameDataWidth;
		this.frameDataHeight = frameDataHeight;

		this.cvRatio = cvRatio;
		this.canvas = canvas;
		this.context = context;
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.imageData = imageData;
		this.offScreenBuf8 = offScreenBuf8;
		this.offScreenBuf = offScreenBuf;

		this.vectorsFrame = new VectorsFrame(); 
		this.vectorsFrame.init(this.frameDataWidth, this.frameDataHeight);
	}

/*
    at(buffer, index, outMv)
    {
		outMv.dx  = buffer[index + 0] & 0x80 ? buffer[index + 0] ^ -0x100 : buffer[index + 0];
		outMv.dy  = buffer[index + 1] & 0x80 ? buffer[index + 1] ^ -0x100 : buffer[index + 1];
		outMv.sad = (buffer[index + 3]<<8) + buffer[index + 2];

		outMv.dir = Math.atan2(outMv.dy, -outMv.dx) * 180 / Math.PI + 180;
		outMv.mag = Math.sqrt(outMv.dx * outMv.dx + outMv.dy * outMv.dy);

//		return outMv;
    }
*/

	render(data)
	{
		let frame = new Uint8Array(data);
		var x, y;
		let mv = {};

		// Normal behaviour.
		this.vectorsFrame.loadFrame(frame, this.frameDataWidth, this.frameDataHeight);

		// Render the vectors, colored by magnitude, we collected in the first pass.
		for(y = 0; y < this.canvasHeight; y++) {
			for(x = 0; x < this.canvasWidth; x++) {
				mv = this.vectorsFrame.at(Math.floor(x*this.cvRatio), Math.floor(y*this.cvRatio));
				// Support for both 'setup player' (no controls, larger dots) and 'development player' (controls, smaller dots)
				//if((mv.mag > 0 && Math.floor(x*this.cvRatio) == (x*this.cvRatio) && Math.floor(y*this.cvRatio) == (y*this.cvRatio))) {
				if(mv.mag > 0) {
					// Top-to-bottom: alpha, blue, green, red
					this.offScreenBuf[y * this.canvasWidth + x] =
						((40 + (mv.mag * 3)) << 24) |
						(0xff << 16) |
						(0xff << 8)  |
						(0xff);
				} else {
					// Will only set alpha to 0 for this pixel (good enough!)
					this.offScreenBuf[y * this.canvasWidth + x] = 0x00;
				}
			}
		}

		this.imageData.data.set(this.offScreenBuf8);
		this.context.putImageData(this.imageData, 0, 0);
//		clearContext();
/*
		this.context.strokeStyle = "#FF00FF";
		this.context.beginPath();
		this.context.arc(100, 75, 50, 0, 2 * Math.PI + (Date.now() % 2));
		this.context.stroke();
*/
	}
}
