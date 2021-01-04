"use strict";

import  { MotionRenderer } from "./motionrenderer";
import { copyGeography } from "../lib/utils.js";


export default class MotionStreamer
{
	/*
	webSocket;
	motionRenderer;
	messageHandler;
	*/
	constructor()
	{
		this.webSocket = null;
		this.motionRenderer = null;
		this.messageHandler = null;
	}

	start(motionCanvas, videoCanvas, wsUri, port, reconnectInterval, messageHandlerCallback )
	{
		this.messageHandler = messageHandlerCallback;
		
		if(!this.motionRenderer) {
			this.motionRenderer = new MotionRenderer(motionCanvas);
			this.motionRenderer.configure(videoCanvas.width, videoCanvas.height);
		}
	
		this.configureCanvas(motionCanvas, videoCanvas);
		this.setupWebSocket(wsUri, port, reconnectInterval);
	}

	getWebSocket()
	{
		return this.webSocket;
	}
	
	sendMessage(message)
	{
		this.webSocket.send(JSON.stringify(message));
	}
	
	onResize(motionCanvas, videoCanvas)
	{
		this.configureCanvas(motionCanvas, videoCanvas);
		this.motionRenderer.configure(videoCanvas.width, videoCanvas.height);
	}
	
	stop()
	{
		if(this.webSocket) {
			this.webSocket.close();
		}
	
		if(this.motionRenderer) {
			this.motionRenderer.stop();
		}
	}
	
	configureCanvas(motionCanvas, videoCanvas)
	{
		if(!motionCanvas || !videoCanvas) {
			console.warn("Canvases are not there. Perhaps they were destroyed.");
			return;
		}

		copyGeography(videoCanvas, motionCanvas);
/*
		let vsRect = videoCanvas.getBoundingClientRect();
	
		let totBorderSize = 2;
		let styles = {
			position	: "absolute",
			zIndex		: 10,
			// left		: vsRect.left + "px",
			// top			: vsRect.top + "px",
			left		: (vsRect.left - window.pageXOffset) + "px",
			top			: (vsRect.top - window.pageYOffset) + "px",
			width		: vsRect.width - totBorderSize + "px",
			height		: vsRect.height - totBorderSize + "px"
		};
	
		for(let s in styles) {
			motionCanvas.style[s] = styles[s];
		}
*/
	}
	
	handleMessage(dataType, data)
	{
		if(dataType === "string" && data.length > 0) {
			let parsed = JSON.parse(data);
	
			if(parsed.settings) {
				this.motionRenderer.configure(parsed.settings.width, parsed.settings.height);
			}
			
			if(this.messageHandler && !parsed.clusters) {
				// Deal with other types of messages (e.g. events)
				this.messageHandler(parsed);
			}
	
			if(document.hidden) {
				return;
			}
	
			this.motionRenderer.update(dataType, parsed);
	
		} else {
			if(document.hidden) {
				return;
			}
			this.motionRenderer.update(dataType, data);
		}
	}
	
	setupWebSocket(wsUri, port, reconnectInterval)
	{
		let that = this;
		console.log("Attempting to connect to: ", wsUri + port);
	
		this.webSocket = new WebSocket(wsUri + port);
		this.webSocket.binaryType = 'arraybuffer';
		this.webSocket.onopen = function (e) {
			console.log('Connected motion stream...');
	
			that.webSocket.onmessage = function(msg) {
				that.handleMessage(typeof msg.data, msg.data);
			}
		}
	
		this.webSocket.onclose = function (e) {
			console.log('Disconnected motion stream...');
			that.webSocket = null;
	
			if(reconnectInterval > 0) {
				setTimeout(function() {
					that.setupWebSocket(wsUri, port, reconnectInterval);
				}, reconnectInterval);
			}
	
		}
	}
			
}
