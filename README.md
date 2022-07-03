# Xorzee
A low-latency, motion detector and HD video streamer. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

- [x] ...HD stream meaning: 1920x1080 @ ~30 frames per second _to web-browser_
- [x] ...low-latency meaning: a delay of no higher than 150 milliseconds [2]
- [x] ...recorded video saved as a popular format[3] real-time
- [x] ...without depending on ffmpeg
- [x] ...able to stream live camera feed directly to dozens of web-clients simultaneously and without intermediaries
- [x] ...stream always or stream on activity
- [x] ...configurable sensitivity of motion detection
- [x] ...save motion-sequences (preview shot and video) to disk
- [x] ...a client should automatically discover all cameras on the network (and show a stream)
- [x] ...ability to signal external programs on activity (or end of), e.g. audio, mail, telegram, ...
- [x] ...modern web-client in Svelte

Pronounced "x or z".

[1] The original one, released in 2015. If it can run on that, it will run on any other Pi with ease.
[2] My use-case is WiFi over a home network
[3] Due to overzealous organizations I avoid mentioning the format by name

## Why?
[Motion](https://motion-project.github.io/) is truly excellent software and I've (well, our cat) depended 
on it for years. At some point I wanted to add more cameras and bumped into Motioneye, which looks great. 
It's just ... I wanted a different UI, auto-discovery of sensors on network, and cheap motion detection. 
Primarily though, a high quality live video stream. So, here I am, hacking away in some of the spare hours 
of the day. :-)


## Supported cameras
Camera boards with sensors IMX219, OV5647 or IMX477 only. USB cameras are not supported.


## Development notes
Performance critical parts are written in Rust. [Frontend](https://github.com/romland/xorzee/tree/main/client) is written in Svelte, the glue of the [backend](https://github.com/romland/xorzee/tree/main/server) is in node-js.


## TODO
- [ ] ...store meta-data of amount of activity in period (graph)


## Credits to other folks
- Notable mention of Samir Das for the fantastic [jMuxer](https://github.com/samirkumardas/jmuxer) for video boxing
- ...and naturally to everyone else contributing to packages in package.json


## Some related keywords
Not RTSP, not broadway.js, live streaming, detect movement, record videos, play videos, html5 video
