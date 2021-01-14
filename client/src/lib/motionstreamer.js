"use strict";

import  { MotionRenderer } from "./motionrenderer";


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

	start(motionCanvas, wsUri, port, reconnectInterval, messageHandlerCallback )
	{
		this.messageHandler = messageHandlerCallback;

		if(!this.motionRenderer) {
			this.motionRenderer = new MotionRenderer(motionCanvas);
		}

		this.setupWebSocket(wsUri, port, reconnectInterval);
	}

	getRenderer()
	{
		if(!this.motionRenderer) {
			throw new Error("No renderer set");
		}
		return this.motionRenderer;
	}

	setVideoSize(videoWidth, videoHeight)
	{
		this.motionRenderer.configure(videoWidth, videoHeight);
	}

	getWebSocket()
	{
		return this.webSocket;
	}
	
	sendMessage(message)
	{
		this.webSocket.send(JSON.stringify(message));
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
