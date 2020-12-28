"use strict";

const NAL_SEPARATOR = new Uint8Array([0, 0, 0, 1]);

var webSocket;
var player;

export function start(wsUri, port, reconnectInterval = 2000, useWebWorkers = true, useWebGL = "auto", onNALunit = null)
{
	if(!player) {
		player = new Player({
			useWorker	: useWebWorkers,
			webgl		: useWebGL,
			workerFile	: "/lib/Decoder.js",
			size : {
				// Merely initial size. Broadway will adjust it.
				width	: 1280,
				height	: 720
			}
		});
	}

	setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
	return player;
}


function setupWebSocket(wsUri, port, reconnectInterval, onNALunit = null)
{
	webSocket = new WebSocket(wsUri + port);
	webSocket.binaryType = 'arraybuffer';

	webSocket.onopen = (e) => {
		console.log('Connected video stream...');
		webSocket.onmessage = (msg) => {
			if(document.hidden) {
				return;
			}

			player.decode(new Uint8Array(addSeparator(msg.data)));

			if(onNALunit) {
				onNALunit(msg.data.byteLength);
			}
		}
	}

	webSocket.onclose = (e) => {
		console.log('Disconnected video stream...');
		webSocket = null;
		if (reconnectInterval > 0) {
			setTimeout(() => {
				setupWebSocket(wsUri, port, reconnectInterval, onNALunit);
			}, reconnectInterval);
		}
	}
}

function addSeparator(buffer)
{
	var tmp = new Uint8Array(4+buffer.byteLength);
	tmp.set(NAL_SEPARATOR, 0);
	tmp.set(new Uint8Array(buffer), 4);
	return tmp.buffer;
}
