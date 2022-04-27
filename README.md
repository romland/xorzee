# Xorzee
A low-latency, HD video streamer and motion detector. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

- [x] ...HD stream meaning: 1920x1080 @ ~30 frames per second _to web-browser_
- [x] ...low-latency meaning: a delay of no higher than 150 milliseconds
- [x] ...wrapping h264 stream to MP4 serverside (optional)
- [x] ...write recorded video clips as mp4 real-time (optional)
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


### Projects (partially or fully) in the same vein
- _Motion_  
  The excellent project that made me start this project. Primarily motion detection, less focus on streaming.
  https://github.com/Motion-Project/motion
- _Motion (MMAL)_  
  http://wiki.raspberrytorte.com/index.php?title=Motion_MMAL  
- _Motioneye_  
  This is what I _wish_ did what I wanted (depends on Motion)
- _UV4L_  
  Streaming only, I believe. Ran into it many years ago for another project, ran into bugs, closed source so could not debug.  
- _Rpisurv_  
  Require multiple devices (it's essentially a camera server)  
  https://github.com/esiexata/rpisurv
- _iSpy_  
  Streaming only.  
  https://github.com/esiexata/iSpy
- _Telepi_  
  Streaming only (and not to web clients)  
  https://github.com/esiexata/telepi
- _Kerberos_  
  Streaming and motion detection. Looks great. I am however unable to get real low-latency stream going.  
  https://kerberos.io
- _A number of video streaming implementations depending on Broadway.js_  
	https://github.com/131/h264-live-player  
	https://github.com/pimterry/raspivid-stream  
	https://github.com/pimterry/pi-cam  
	https://github.com/matijagaspar/ws-avc-player  
	https://github.com/TeaFlex/PiStreamer  


## Some related keywords
Not RTSP, not broadway.js, h264, live streaming, detect movement, record videos, play videos, html5 video, mp4, hls
