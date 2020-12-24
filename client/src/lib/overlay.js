"use strict";

import { VectorsFrame, getVectorAt } from "./vectorsframe";

// TODO
// want to save last 'clips' as a thumbnail (server tho) ...


const RENDER_RAW = false;


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

		let frameDataHeight = Math.floor( height / 16) + 1;
		let frameDataWidth = Math.floor( width / 16) + 1;

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
				console.log(parsed);
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
				this.renderShapes(parsed);
			}

		} else if(dataType === "object") {
			if(RENDER_RAW && this.initialized) {
				this.renderVectors(new Uint8Array(data));
			}
		} else {
			console.log("unknown datatype", dataType);
		}

	}

	clearContext()
	{
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	renderShapes(data)
	{
		if(!data.clusters || data.clusters.length === 0) {
			return;
		}

		let reverseCvRatio = (1/this.cvRatio);

//		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		let c;
		for(let i = 0; i < data.clusters.length; i++) {
			c = data.clusters[i];

			if(c.within) {
				this.context.strokeStyle = "#000000ff";
			} else {
				this.context.strokeStyle = "#FFFF00ff";
			}
			this.context.beginPath();

			c.box[0] = (c.box[0] - 0) * reverseCvRatio;	// top
			c.box[1] = (c.box[1] - 0) * reverseCvRatio;	// right
			c.box[2] = (c.box[2] - 0) * reverseCvRatio;	// bottom
			c.box[3] = (c.box[3] - 0) * reverseCvRatio;	// left

			this.context.rect(
				c.box[3],				// left / x
				c.box[0],				// top / y
				c.box[1] - c.box[3],	// width
				c.box[2] - c.box[0]		// height
			);
			this.context.stroke();
		}
	}

	// Raw motion data
	renderVectors(frame)
	{
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
	}
}
