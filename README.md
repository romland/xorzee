# Better Motion

npm i @clusterws/cws (replaced uws with this as I run 32 bit arm 72)

----
Stop Vidensi recorder (or camera is booked!)

First start:

        node index.js --udpport 8000 --wsport 8081


Then connect camera to streamer:

        raspivid -hf -vf -n -v -w 1920 -h 1080 -t 0 -fps 25 -ih -b 700000 -pf baseline -o - | nc -D localhost 8000

        With more? keyframes:
        raspivid -ih -stm -hf -vf -n -v -w 1920 -t 0 -fps 24 -ih -b 1700000 -pf baseline -o - | nc localhost 8000


Then start a http-server to host entire directory (quick and dirty)

        node node_modules/http-server/bin/http-server .


To put into ffmpeg cheaply (to be able to save)

        raspivid -hf -vf -n -v -w 1920 -t 0 -fps 25 -ih -b 1700000 -pf baseline -o - | ffmpeg -v debug -y -analyzeduration 9M -probesize 9M -i pipe:0 -codec copy out.h264


Further, what is needed:
------------------------
- be able to trigger recording of video
        Currently thinking triggering a forward of buffer to ffmpeg via child process,
        see:
        - https://stackoverflow.com/questions/46073876/node-js-buffer-data-to-ffmpeg

- be able to get a screenshot from stream



Later
-----
- be able to put overlay (timestamp?) on saved stream
- live client can just slap its own overlays on


Based on work by Dregu (github.com/dregu)

# Old stuff

=====================================================================

Ultra fast live streaming raw h264 from Raspberry Pi to multiple browser
clients with Node, websockets and
[Broadway](https://github.com/mbebenita/Broadway). The latency on LAN at 25fps
is about 4 frames or 160ms.

## Installation
```
npm install
```
If you are going to use UDP, also install socat.
```
apt install socat
```
Tested on RPI1, raspbian jessie and node v7.4.0.

## Server
Receives h264 stream from raspivid and serves it to websocket clients.
Start with ```node index.js --udpport 8000 --wsport 8081``` for UDP mode
or ```node index.js --tcpport 8000 --wsport 8081``` for TCP mode.

## Streamer
Streams live h264 from raspivid (or gstreamer) to the server. Check raspi.sh
and start with ```./raspi.sh```. You could use something like
```ffmpeg -re -i foo.mp4 -c:v copy -f h264 udp://localhost:8000```
to stream anything, just remember Broadway only supports h264 baseline and
no audio.

## HTTP-server
You should get one. Tested with ```http-server``` from npm.

## Client
Minimal client is now running at ```http://server-ip:8080/```.
Works on most things with canvas and websockets.

