"use strict";

const NAL_SEPARATOR = new Uint8Array([0, 0, 0, 1]);

import JMuxer from 'jmuxer/src/jmuxer.js';	// don't go with default .min.js
import { videoPlayers } from '../state.js';

export default class VideoStreamer
{
	/*
		this.player
		this.webSocket
		this.playerType
		this.videoEltId (maybe)
	*/
	constructor(useWebWorkers = true, useWebGL = "auto", width = 1280, height = 720, playerType = 'broadway')
	{
		this.playerType = playerType;
		this.webSocket = null;

		// alternatives: broadway, jmuxer, serverjmuxer
		if(playerType === "serverjmuxer") {
			let elt = document.createElement(`video`);
			this.videoEltId = "videoElt" + Date.now();
			elt.id = this.videoEltId;
			elt.controls = false;
			elt.autoplay = true;
			elt.muted = true;
			let styles = {
				width : "100%",
				transformOrigin : "center center 0px",
				transform : "translate(0px, 0px) scale(1)"
			};

			for(let s in styles) {
				elt.style[s] = styles[s];
			}
		
			this.player = {
				playerType	: playerType,
				canvas		: elt,
				data : {
					video : null,
				}
			};


		} else if(playerType === "jmuxer") {
			let elt = document.createElement(`video`);
			this.videoEltId = "videoElt" + Date.now();
			elt.id = this.videoEltId;
			elt.controls = false;
			elt.autoplay = true;
			elt.muted = true;
			let styles = {
				width : "100%",
				transformOrigin : "center center 0px",
				transform : "translate(0px, 0px) scale(1)"
			};

			for(let s in styles) {
				elt.style[s] = styles[s];
			}
		
			this.player = {
				playerType	: playerType,
				canvas		: elt,
				data : {
					video : null,
				}				
			};
		} else {
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
		videoPlayers.push(this);
	}

	getWebSocket()
	{
		return this.webSocket;
	}

	start(wsUri, port, reconnectInterval = 2000, onNALunit = null, frameRate = null)
	{
		if(this.playerType === "jmuxer" || this.playerType === "serverjmuxer") {
			let firefoxAgent = navigator.userAgent.indexOf("Firefox") > -1; 

			if(this.playerType === "jmuxer") {
				this.player.jmuxer = new JMuxer({
					node	: this.videoEltId,
					mode	: 'video',
					flushingTime : 1,
					clearBuffer : true,
					// debug	: true,
					// duration: 1000 / frameRate,
					// TODO: This is pretty messed up, but it does give me better 'live' feel in various browsers.
					fps		: frameRate + (firefoxAgent ? 0.5 : 2),
					// fps		: frameRate,
				});
			} else {
				// serverside muxing -- do I need to do anything here?
			}

			// this is the shit that makes FF stutter -- but it keeps it close to live :(
			setInterval(() => {
				if(this.player.canvas.currentTime < (this.player.canvas.duration - 0.5)) {
					if(!firefoxAgent) {
						console.log("CATCHING UO TO LIVE. BEFORE: currentTime", this.player.canvas.currentTime, "duration", this.player.canvas.duration, "seekable", this.player.canvas.seekable.start(0), "-", this.player.canvas.seekable.end(0))
						// this.player.canvas.currentTime = this.player.canvas.duration;
						this.player.canvas.currentTime = this.player.canvas.seekable.end(0);
					} else {
						console.log("Firefox lagging behind:", (this.player.canvas.duration - this.player.canvas.currentTime))
					}
				}
			}, 5000);

		}

		this._setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
	}

	_setupWebSocket(wsUri, port, reconnectInterval, onNALunit = null)
	{
		let that = this;

		this.webSocket = new WebSocket(wsUri + port);
		this.webSocket.binaryType = 'arraybuffer';

		if(this.playerType === "serverjmuxer") {
			var chunks = [];
			var mse = new (MediaSource || WebKitMediaSource)();
			var sourceBuffer;

			const onMediaSourceOpen = () => {
				sourceBuffer = mse.addSourceBuffer('video/mp4; codecs="avc1.4d401f"');
				sourceBuffer.addEventListener('updateend', addMoreBuffer);
				this.player.canvas.play();
			}

			const addMoreBuffer = () => {
				if (!sourceBuffer || sourceBuffer.updating || !chunks.length) {
					return;
				}
				try {
					sourceBuffer.appendBuffer(chunks.shift());
				} catch(ex) {
					console.error(ex.message, ex);
					console.log("error, killed websocket");
					ws.close();
				}
			}

			this.player.canvas.src = URL.createObjectURL(mse);
			// video.controls = false;
			mse.addEventListener('sourceopen', onMediaSourceOpen);

			this.webSocket.onopen = (e) => {
				console.log('Connected video stream...');
				that.webSocket.onmessage = (msg) => {
					if(document.hidden) {
						return;
					}

					chunks.push(new Uint8Array(msg.data));
					addMoreBuffer();
				
					if(onNALunit) {
						onNALunit(msg.data.byteLength);
					}
				}
			}			
		} else {
			this.webSocket.onopen = (e) => {
				console.log('Connected video stream...');
				that.webSocket.onmessage = (msg) => {
					if(document.hidden) {
						return;
					}
	
					if(this.playerType === "jmuxer") {
						// Jmuxer
						var tmp = new Uint8Array(4+msg.data.byteLength);
						tmp.set(NAL_SEPARATOR, 0);
						tmp.set(new Uint8Array(msg.data), 4);
	
						this.player.data.video = tmp;
						this.player.jmuxer.feed(this.player.data);
					} else if(this.playerType === "broadway") {
						// XXX Broadway -- wtf: why make Uint array here and get a buffer back and then go uint array again
						that.player.decode(new Uint8Array(that.addSeparator(msg.data)));
	
					} else {
						throw "Unknown playerType " + this.playerType;
					}
	
					if(onNALunit) {
						onNALunit(msg.data.byteLength);
					}
				}
			}
	
		}


		this.webSocket.onclose = (e) => {
			console.log('Disconnected video stream...');
			that.webSocket = null;
			if (reconnectInterval > 0) {
				setTimeout(() => {
					that._setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
				}, reconnectInterval);
			}
		}
	}
	
	addSeparator(buffer, returnUint = false)
	{
		var tmp = new Uint8Array(4+buffer.byteLength);
		tmp.set(NAL_SEPARATOR, 0);
		tmp.set(new Uint8Array(buffer), 4);
		return returnUint ? tmp : tmp.buffer;
	}
		
	
	getPlayer()
	{
		return this.player;
	}
}
