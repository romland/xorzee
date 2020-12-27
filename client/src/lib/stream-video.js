"use strict";

const NAL_SEPARATOR = new Uint8Array([0, 0, 0, 1]);

var webSocket;


function addSeparator(buffer)
{
	var tmp = new Uint8Array(4+buffer.byteLength);
	tmp.set(NAL_SEPARATOR, 0);
	tmp.set(new Uint8Array(buffer), 4);
	return tmp.buffer;
}


export function start(
	container,
	wsUri,
	port,
	reconnectInterval,
	initialCanvasWidth, initialCanvasHeight,
	useWebWorkers = true,
	useWebGL = "auto"
)
{

	if(!window.player) {
		window.player = new Player({
			useWorker	: useWebWorkers,
			webgl		: useWebGL,
			workerFile	: "/lib/Decoder.js",
			size : {
				width	: initialCanvasWidth,
				height	: initialCanvasHeight
			}
		});
		// Must be first element in the container
		container.prepend(window.player.canvas);

		window.debugger = new debug(container);
	}

	setupWebSocket(container, wsUri, port, reconnectInterval, useWebWorkers, useWebGL);

	return window.player.canvas;
}


function setupWebSocket(container, wsUri, port, reconnectInterval, useWorker, webgl)
{
	webSocket = new WebSocket(wsUri + port);
	webSocket.binaryType = 'arraybuffer';

	webSocket.onopen = (e) => {
		console.log('Connected video stream...');
		webSocket.onmessage = (msg) => {
			if(document.hidden) {
				return;
			}
			
			window.player.decode(new Uint8Array(addSeparator(msg.data)));

			if(window.debugger) {
				window.debugger.nal(msg.data.byteLength);
			}
		}
	}

	webSocket.onclose = (e) => {
		console.log('Disconnected video stream...');
		webSocket = null;
		if (reconnectInterval > 0) {
			setTimeout(() => {
				start(container, wsUri, port, reconnectInterval, useWorker, webgl)
			}, reconnectInterval);
		}
	}
}


// debugger stuff
function avgFPS(length)
{
	this.index = 0;
	this.sum = 0;
	this.length = length;
	this.buffer = Array.apply(null, Array(length)).map(Number.prototype.valueOf,0);

	this.tick = (tick) => {
		this.sum -= this.buffer[this.index];
		this.sum += tick;
		this.buffer[this.index] = tick;
		if (++this.index == this.length) this.index = 0;
		return Math.floor(this.sum/this.length);
	}

	this.avg = () => {
		return Math.floor(this.sum/this.length);
	}

	return this;
}


function debug(container)
{
	this.started = +new Date();
	this.fps = new avgFPS(50);
	this.last = +new Date();
	this.nals = 0;
	this.frames = 0;
	this.total = 0;
	this.secondTotal = 0;
	this.playerWidth = 0;
	this.playerHeight = 0;
	this.statsElement = document.createElement('div');

	container.appendChild(this.statsElement);
	window.player.onPictureDecoded = function(buffer, width, height, infos) {
		window.debugger.frame(width, height);
	}

	this.nal = function(bytes) {
		this.nals++;
		this.total += bytes;
		this.secondTotal += bytes;
	}

	this.frame = function(w, h) {
		this.playerWidth = w;
		this.playerHeight = h;
		this.frames++;
		var now = +new Date(), delta = now - window.debugger.last;
		this.fps.tick(delta);
		this.last = now;
	}

	setInterval(function()
	{
		var mib = (window.debugger.total/1048576).toFixed(2);
		var date = new Date(null);
		date.setSeconds((+new Date()-window.debugger.started)/1000);
		var dur = date.toISOString().substr(11, 8);
		window.debugger.statsElement.innerHTML = window.debugger.playerWidth+'x'+window.debugger.playerHeight
			+', '+Math.floor(1/window.debugger.fps.avg()*1000)+' fps, '
			+(window.debugger.secondTotal/1024).toFixed(2)+' KiB/s, '
			+(window.debugger.secondTotal/1024/125).toFixed(2)+' Mbit/s, '
			+'total '+mib+' MiB, '
			+window.debugger.nals+' NAL units, '+window.debugger.frames+' frames in '+dur;
		window.debugger.secondTotal = 0;
	}, 1000);
}
