"use strict";

import { VectorsFrame, getVectorAt } from "./vectorsframe";
import { outlineAll } from "./edges";

// TODO
// want to save last 'clips' as a thumbnail (server tho) ...

// http://82.74.2.185:8080

const RBT_RECTANGLE = 1;
const RBT_CONVEX = 2;

const RENDER_RAW = true;
const RENDER_BOUND_TYPE = RBT_CONVEX;



/*
at different resolution:

the boxes and raw data render in wrong places, indicates that it is server?

*/




export class Overlay
{
	/*
		this.overlayCanvas
	*/
	constructor()
	{
		console.log("overlay constructor called");

		window.onresize = () => {
			if(this.streamSettings) {
				this.init(this.streamSettings.width, this.streamSettings.height);
			}
		};

		new ResizeObserver((elt) => {
			console.log("streamCanvas change", elt);
			if(this.streamSettings) {
				this.init(this.streamSettings.width, this.streamSettings.height, elt);
			} else {
				console.log("streamCanvas changed without us having settings");
//				this.copyCanvas(elt);
			}
		}).observe(document.querySelector("#container > canvas:first-of-type"));

	}

	copyCanvas(resizedElt = null)
	{
		if(this.overlayCanvas) {
			this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
		}

		let streamCanvas = document.querySelector("#container > canvas:first-of-type");
		let streamRect;
		if(resizedElt) {
			streamRect = resizedElt[0].target.getBoundingClientRect();
		} else {
			streamRect = streamCanvas.getBoundingClientRect();
		}

		let totBorderSize = 2;


		let container = document.getElementById("container");
		let overlayCanvas = document.createElement("canvas");
		let overlayId = `overlay${Date.now()}`;
		overlayCanvas.id = overlayId;
		overlayCanvas.style.position = "absolute";
		overlayCanvas.style.zIndex = 10;
		overlayCanvas.style.left = streamRect.left + "px";
		overlayCanvas.style.top = streamRect.top + "px";
		overlayCanvas.style.width = streamRect.width - totBorderSize + "px";
		overlayCanvas.style.height = streamRect.height - totBorderSize + "px";

		container.appendChild(overlayCanvas);

		this.overlayCanvas = overlayCanvas;
	}

	// This is actual stream-size (not canvas per se)
	init(width, height, resizedElt = null)
	{
		this.copyCanvas(resizedElt);

		let frameDataWidth = Math.floor( width / 16) + 1;
		let frameDataHeight = Math.floor( height / 16) + 1;

		let cvRatio = 0;			// Ratio of canvas' pixel-width to number-of-vectors' width.
		let canvas, context, canvasWidth, canvasHeight, imageData;
		let offScreenBuf8, offScreenBuf;

		canvas = this.overlayCanvas;
		context = canvas.getContext("2d");

		// For now, just do 1:1 ratio (low-res).

		// Modify this for lesser/better rendering over overlay
//		canvasWidth = frameDataWidth * 8;
//		canvasHeight = frameDataHeight * 8;
		canvasWidth = width / 2;
		canvasHeight = height / 2;

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
		this.reverseCvRatio = (1/this.cvRatio);
		this.canvas = canvas;
		this.context = context;
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.imageData = imageData;
		this.offScreenBuf8 = offScreenBuf8;
		this.offScreenBuf = offScreenBuf;

		this.vectorsFrame = new VectorsFrame(); 
		this.vectorsFrame.init(this.frameDataWidth, this.frameDataHeight);

		this.initialized = true;
	}

	render(data, dataType)
	{
		if(dataType === "string" && data.length > 0) {
			let parsed = JSON.parse(data);
			if(parsed.settings) {
				console.log("Got setting, setting 'em: ", parsed);
				this.streamSettings = parsed.settings;
				this.init(this.streamSettings.width, this.streamSettings.height);
				return;
			} else if(!parsed.clusters) {
				console.log("event", parsed);
			}

			if(this.initialized && parsed.clusters) {
				if(!RENDER_RAW) {
					this.clearContext();
				}

// This is what we are interested in primarily on client
/*
				if(parsed.history.length > 0) {
					console.log(parsed.history)
				}
*/

				if(RENDER_BOUND_TYPE === RBT_CONVEX) {
//					console.log(parsed.clusters);
				 	outlineAll(this.context, this.reverseCvRatio, parsed.clusters);
				} else if(RENDER_BOUND_TYPE === RBT_RECTANGLE) {
					this.renderShapes(parsed);
				}
			}

		} else if(dataType === "object") {
			if(RENDER_RAW && this.initialized) {
//				try {
					this.renderVectors(new Uint8Array(data));
				// } catch(ex) {
				// 	console.error(ex);
				// }
			}
		} else {
			console.log("unknown datatype", dataType);
		}

	}

	clearContext()
	{
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	// rs = ReverseScale
	rs(num)
	{
		return num * this.reverseCvRatio;
	}

	// scale
	s(num)
	{
		return num * this.cvRatio;
	}

	renderShapes(data)
	{
		// const clusters = data.clusters;
		const clusters = data.history;

		if(!clusters || clusters.length === 0) {
			return;
		}

		let c;
		for(let i = 0; i < clusters.length; i++) {
			c = clusters[i];

			if(c.within) {
				this.context.strokeStyle = "#000000ff";
			} else {
				this.context.strokeStyle = "#FFFF00ff";
			}

			this.context.beginPath();

			c.box[0] = this.rs(c.box[0] - 0);	// top
			c.box[1] = this.rs(c.box[1] - 0);	// right
			c.box[2] = this.rs(c.box[2] - 0);	// bottom
			c.box[3] = this.rs(c.box[3] - 0);	// left

			this.context.rect(
				c.box[3],						// left / x
				c.box[0],						// top / y
				c.box[1] - c.box[3],			// width
				c.box[2] - c.box[0]				// height
			);
			this.context.stroke();

			// ctx.measureText('foo'); 
			this.context.font = '8px serif';
			this.context.fillStyle = "#ffffffff";
//			this.context.strokeStyle = "#ffff00ff";
			this.context.fillText(
				'' + c.id + ", " + c.birth,
				c.box[3],
				c.box[0] - 2
			);
		}
	}

	// Raw motion data
	renderVectors(frame)
	{
		var x, y;
		let mv = {};

		this.vectorsFrame.loadFrame(frame, this.frameDataWidth, this.frameDataHeight);

// error: no mv! vector coord: 0 46 vector res: 81 46 real coord:  0 364 real res: 640 365

		// Render the vectors, strength by magnitude
		for(y = 0; y < this.canvasHeight; y++) {
			for(x = 0; x < this.canvasWidth; x++) {

				mv = this.vectorsFrame.at(Math.floor(this.s(x)), Math.floor(this.s(y)));
				if(!mv) {
					console.log(
						"error: no mv!",
						"vector coord:", Math.floor(this.s(x)), Math.floor(this.s(y)),
						"vector res:", this.frameDataWidth, this.frameDataHeight,
						"real coord: ", x, y,
						"real res (actual pixels -- canvas may be resized to bigger):", this.canvasWidth, this.canvasHeight
					);
				}

				//if((mv.mag > 0 && Math.floor(this.s(x)) == (this.s(x)) && Math.floor(this.s(y)) == (this.s(y)))) {
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
	}
}
