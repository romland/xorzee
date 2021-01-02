"use strict";

import  { MotionRenderer } from "./motionrenderer";

var webSocket;
var motionRenderer;
var messageHandler;

export function getWebSocket()
{
	return webSocket;
}

export function sendMessage(message)
{
	webSocket.send(JSON.stringify(message));
}

export function onResize(motionCanvas, videoCanvas)
{
	configureCanvas(motionCanvas, videoCanvas);
	motionRenderer.configure(videoCanvas.width, videoCanvas.height);
}

export function start(motionCanvas, videoCanvas, wsUri, port, reconnectInterval, messageHandlerCallback )
{
	messageHandler = messageHandlerCallback
	
	if(!motionRenderer) {
		motionRenderer = new MotionRenderer(motionCanvas);
		motionRenderer.configure(videoCanvas.width, videoCanvas.height);
	}

	configureCanvas(motionCanvas, videoCanvas);
	setupWebSocket(wsUri, port, reconnectInterval);
}

export function stop()
{
	if(webSocket) {
		webSocket.close();
	}

	if(motionRenderer) {
		motionRenderer.stop();
	}
}

function configureCanvas(motionCanvas, videoCanvas)
{
	let vsRect = videoCanvas.getBoundingClientRect();

	let totBorderSize = 2;
	let styles = {
		position	: "absolute",
		zIndex		: 10,
		left		: vsRect.left + "px",
		top			: vsRect.top + "px",
		width		: vsRect.width - totBorderSize + "px",
		height		: vsRect.height - totBorderSize + "px"
	};

	for(let s in styles) {
		motionCanvas.style[s] = styles[s];
	}
}

function handleMessage(dataType, data)
{
	if(dataType === "string" && data.length > 0) {
		let parsed = JSON.parse(data);

		if(parsed.settings) {
			motionRenderer.configure(parsed.settings.width, parsed.settings.height);
		}
		
		if(messageHandler && !parsed.clusters) {
			// Deal with other types of messages (e.g. events)
			messageHandler(parsed);
		}

		if(document.hidden) {
			return;
		}

		motionRenderer.update(dataType, parsed);

	} else {
		if(document.hidden) {
			return;
		}
		motionRenderer.update(dataType, data);
	}
}

function setupWebSocket(wsUri, port, reconnectInterval)
{
	webSocket = new WebSocket(wsUri + port);
	webSocket.binaryType = 'arraybuffer';
	webSocket.onopen = function (e) {
		console.log('Connected motion stream...');

		webSocket.onmessage = function(msg) {
			handleMessage(typeof msg.data, msg.data);
		}
	}

	webSocket.onclose = function (e) {
		console.log('Disconnected motion stream...');
		webSocket = null;

		if(reconnectInterval > 0) {
			setTimeout(function() {
				setupWebSocket(wsUri, port, reconnectInterval);
			}, reconnectInterval);
		}

	}
}
