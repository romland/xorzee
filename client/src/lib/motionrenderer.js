"use strict";

import { VectorsFrame, getVectorAt } from "./vectorsframe";
import { outlineAll } from "./convex-hull";

const RBT_RECTANGLE = 1;
const RBT_CONVEX = 2;
const RENDER_BOUND_TYPE = RBT_CONVEX;

const RENDER_RAW = false;


export class MotionRenderer
{
	/*
		this.motionCanvas
	*/
	constructor(motionCanvas)
	{
		this.motionCanvas = motionCanvas;
	}


	// This is actual stream-size (not canvas per se)
	configure(videoWidth, videoHeight)
	{
		let frameDataWidth = Math.floor( videoWidth / 16) + 1;
		let frameDataHeight = Math.floor( videoHeight / 16) + 1;

		let cvRatio = 0;			// Ratio of canvas' pixel-width to number-of-vectors' width.
		let context, canvasWidth, canvasHeight, imageData;
		let offScreenBuf8, offScreenBuf;

		context = this.motionCanvas.getContext("2d");

		// For now, just do 1:1 ratio (low-res).
		// Modify this for lesser/better rendering over overlay
//		canvasWidth = frameDataWidth * 8;
//		canvasHeight = frameDataHeight * 8;
		canvasWidth = videoWidth / 2;
		canvasHeight = videoHeight / 2;

		// At some point we could allow both x and y ratio. Later.
		cvRatio = frameDataWidth / canvasWidth;
		this.motionCanvas.width = canvasWidth;
		this.motionCanvas.height = canvasHeight;

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

	render(dataType, data)
	{
		if(!this.initialized) {
			return;
		}

		if(dataType === "string") {
			if(data.clusters) {
				if(!RENDER_RAW) {
					this.clearContext();
				}

				if(RENDER_BOUND_TYPE === RBT_CONVEX) {
					 outlineAll(
						 this.context,
						 this.reverseCvRatio,
						 data.clusters
					);
					 
				} else if(RENDER_BOUND_TYPE === RBT_RECTANGLE) {
					this.renderShapes(
						data
					);
				}
			}

		} else if(dataType === "object" && RENDER_RAW) {
			this.renderVectors(
				new Uint8Array(data)
			);
		}

	}

	clearContext()
	{
		this.context.clearRect(0, 0, this.motionCanvas.width, this.motionCanvas.height);
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


	getVectorAt(index, frame, outMv)
	{
		outMv.dx  = frame[index + 0] & 0x80 ? frame[index + 0] ^ -0x100 : frame[index + 0];
		outMv.dy  = frame[index + 1] & 0x80 ? frame[index + 1] ^ -0x100 : frame[index + 1];
		outMv.sad = (frame[index + 3]<<8) + frame[index + 2];

		outMv.mag = Math.sqrt(outMv.dx * outMv.dx + outMv.dy * outMv.dy);

		outMv.dir = Math.atan2(outMv.dy, -outMv.dx) * 180 / Math.PI + 180;

		// I spell this one out because it could be deemed 'dangerous' at some point.
		if(outMv.dir === 360) {
			outMv.dir = 0;
		}
	}
	

	// Raw motion data
	renderVectors(frame)
	{
		var x, y;
		let mv = {};

		this.vectorsFrame.loadFrame(frame, this.frameDataWidth, this.frameDataHeight);

		// Render the vectors, strength by magnitude
		for(y = 0; y < this.canvasHeight; y++) {
			for(x = 0; x < this.canvasWidth; x++) {

				mv = this.vectorsFrame.at(Math.floor(this.s(x)), Math.floor(this.s(y)));
				// this.getVectorAt(((Math.floor(this.s(y)) * this.frameDataWidth + Math.floor(this.s(x)))*4), frame, mv);

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
