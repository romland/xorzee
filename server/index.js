"use strict";
/*
Run:

1. node index.js --udpport 8000 --wsport 8081
2. raspivid -ih -stm -hf -vf -n -v -w 1920 -t 0 -fps 24 -ih -b 1700000 -pf baseline -o - | nc localhost 8000
3. node node_modules/http-server/bin/http-server .

Go to http://raspi-ip:8080/


*/


const net = require('net');
const dgram = require('dgram');
const WebSocket = require('@clusterws/cws');
const Split = require('stream-split');
const NALSeparator = new Buffer([0, 0, 0, 1]);
const express = require('express');
const systemd = require('systemd');
const app = express();

const cp = require('child_process');

const SAVE_STREAM = false;

	var wsServer, conf = require('nconf');
	var headers = [];

	conf.argv().defaults({
		tcpport		: 8000,
		udpport		: 8000,
		wsport		: 8081,
		queryport	: false,
		limit		: 150
	});


	if(SAVE_STREAM) {
		// https://gist.github.com/steven2358/ba153c642fe2bb1e47485962df07c730
		// Extract a frame each second: ffmpeg -i input.mp4 -vf fps=1 thumb%04d.jpg -hide_banner

		// ffmpeg -v debug -y -analyzeduration 9M -probesize 9M -i pipe:0 -codec copy out.h264

		var proc = cp.spawn('/usr/bin/ffmpeg', [
			'-hide_banner',
			'-y',
			'-analyzeduration', '9M',
			'-probesize', '9M',
			'-i', '-',
			'-codec', 'copy',
			'out.h264'
		]);

		proc.stdout.setEncoding('utf8');
		proc.stdout.on('data', function(data) {
		    console.log('FFMPEG stdout: ' + data);
		});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', function(data) {
		    console.log('FFMPEG stderr: ' + data);
		});

		proc.on('close', function(code) {
		    console.log('FFMPEG closing code: ' + code);
		});

		process.on('SIGTERM', () => {
			// end saving of ffmpeg stream
			console.log("ending recording...");
			proc.stdin.end();
		});
	}


	if (conf.get('queryport')) {
		app.get('/', (req, res) => {
			var count = 0;

			wsServer.clients.forEach((ws) => {
				if (ws.readyState == 1) {
					count++;
				}
			})

			res.set('Content-type', 'text/plain');
			res.send(count.toString());
		});

		app.listen(conf.get('queryport'));
	}


	function broadcast(data) {
		wsServer.clients.forEach((ws) => {
			if (ws.readyState === 1) {
				ws.send(data, { binary: true });
			}
		});

	}


	if (conf.get('tcpport')) {
		const tcpServer = net.createServer((socket) => {
			console.log('streamer connected')
			socket.on('end', () => {
				console.log('streamer disconnected')
			})

			headers = [];

			const NALSplitter = new Split(NALSeparator);

			NALSplitter.on('data', (data) => {
//				saveFrame(data);

				if (wsServer && wsServer.clients.length > 0) {
					if (headers.length < 3) {
						headers.push(data)
					}

					broadcast(data);
				}
			}).on('error', (e) => {
				console.log('splitter error ' + e);
				process.exit(0);
			})

			socket.pipe(NALSplitter);

			if(SAVE_STREAM) {
				socket.pipe(proc.stdin);
			}
		});

		tcpServer.listen(conf.get('tcpport'));

		if (conf.get('tcpport') == 'systemd') {
			console.log('TCP server listening on systemd socket')
		} else {
			var address = tcpServer.address();
			if (address) {
				console.log(`TCP server listening on ${address.address}:${address.port}`);
			}
		}
	}

	if (conf.get('udpport')) {
		const udpServer = dgram.createSocket('udp4');

		udpServer.on('listening', () => {
			var address = udpServer.address();
			console.log(
				`UDP server listening on ${address.address}:${address.port}`)
			});

		const NALSplitter = new Split(NALSeparator);

		NALSplitter.on('data', (data) => {
			if (wsServer && wsServer.clients.length > 0) {
				broadcast(data);
			}
		}).on('error', (e) => {
			console.log('splitter error ' + e);
			process.exit(0);
		})

		udpServer.on('message', (msg, rinfo) => {
			NALSplitter.write(msg);
		});

		udpServer.bind(conf.get('udpport'));
	}

	if (conf.get('wsport')) {
		//wsServer = new WSServer({ port: conf.get('wsport') })
		wsServer = new WebSocket.WebSocketServer({ port: conf.get('wsport') });
		console.log(
			`WS server listening on`, conf.get('wsport')
		);

		wsServer.on('connection', (ws) => {
			if (wsServer.clients.length >= conf.get('limit')) {
				console.log('client rejected, limit reached');
				ws.close();
				return;
			}

			console.log('client connected, watching ' + wsServer.clients.length)

			for (let i in headers) {
				ws.send(headers[i]);
			}

			ws.on('close', (ws, id) => {
				console.log('client disconnected, watching ' + wsServer.clients.length);
			})
		});
	}

