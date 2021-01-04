"use strict";

const NAL_SEPARATOR = new Uint8Array([0, 0, 0, 1]);


export default class VideoStreamer
{
	/*
		this.player
		this.webSocket
	*/
	constructor(useWebWorkers = true, useWebGL = "auto", width = 1920, height = 1088)
	{
		this.webSocket = null;
		this.player = new Player({
			useWorker	: useWebWorkers,
			webgl		: useWebGL,
			workerFile	: "/lib/Decoder.js",
			size : {
				// Merely initial size. Broadway will adjust it.
				width	: width,
				height	: height
			}
		});
	}

	getWebSocket()
	{
		return this.webSocket;
	}

	start(wsUri, port, reconnectInterval = 2000, onNALunit = null)
	{
		this._setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
	}

	_setupWebSocket(wsUri, port, reconnectInterval, onNALunit = null)
	{
		let that = this;

		this.webSocket = new WebSocket(wsUri + port);
		this.webSocket.binaryType = 'arraybuffer';
	
		this.webSocket.onopen = (e) => {
			console.log('Connected video stream...');
			that.webSocket.onmessage = (msg) => {
				if(document.hidden) {
					return;
				}
	
				that.player.decode(new Uint8Array(that.addSeparator(msg.data)));
	
				if(onNALunit) {
					onNALunit(msg.data.byteLength);
				}
			}
		}
	
		this.webSocket.onclose = (e) => {
			console.log('Disconnected video stream...');
			that.webSocket = null;
			if (reconnectInterval > 0) {
				setTimeout(() => {
					that.setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
				}, reconnectInterval);
			}
		}
	}
	
	addSeparator(buffer)
	{
		var tmp = new Uint8Array(4+buffer.byteLength);
		tmp.set(NAL_SEPARATOR, 0);
		tmp.set(new Uint8Array(buffer), 4);
		return tmp.buffer;
	}
		
	
	getPlayer()
	{
		return this.player;
	}
}
