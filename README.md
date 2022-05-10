# Xorzee
A low-latency, HD video streamer and motion detector. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

- [x] ...HD stream meaning: 1920x1080 @ ~30 frames per second _to web-browser_
- [x] ...low-latency meaning: a delay of no higher than 150 milliseconds
- [x] ...wrapping h264 stream to MP4 serverside (optionally raw h264)
- [x] ...record video as mp4 real-time (optionally raw h264 or mp4 using ffmpeg)
- [x] ...without depending on ffmpeg (if using serverside MP4)
- [x] ...able to stream live camera feed directly to dozens of web-clients simultaneously and without intermediaries
- [x] ...stream always or stream on activity
- [x] ...configurable sensitivity of motion detection
- [x] ...save motion-sequences (preview shot and video) to disk
- [x] ...a client should automatically discover all cameras on the network (and show a stream)
- [x] ...ability to signal external programs on activity (or end of), e.g. audio, mail, telegram, ...
- [x] ...modern web-client in Svelte

Pronounced "x or z".

[1] The original one, released in 2015. If it can run on that, it will run on any other Pi with ease.


## Why?
Motion is truly excellent software and I've (well, our cat) depended on it for years. At some point
I wanted to add more cameras and bumped into Motioneye, which looks great. It's just ... I wanted a 
different UI, auto-discovery of cameras, and I knew the motion detection could be heaps cheaper. 
Primarily though, a higher quality live stream without bringing the device to its knees. So, here I am,
hacking away in some of the spare hours of the day. :-)


## Supported cameras
Raspberry Pi camera boards (or compatible, with sensors IMX219, OV5647 or IMX477) only. USB cameras are not supported.


## Development notes
Performance critical parts are written in Rust. [Frontend](https://github.com/romland/xorzee/tree/main/client) is written in Svelte, the glue of the [backend](https://github.com/romland/xorzee/tree/main/server) is in node-js.


## TODO
- [ ] ...store meta-data of amount of activity in period (graph)


## Credits to other folks
- Notable mention of Samir Das for the fantastic [jMuxer](https://github.com/samirkumardas/jmuxer) for mp4 boxing
- ...and naturally to everyone else contributing to packages in package.json


## Some related keywords
Not RTSP, not broadway.js, h264, live streaming, detect movement, record videos, play videos, html5 video, mp4, hls
