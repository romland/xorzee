# Xorzee
A low-latency, HD video streamer and motion detector. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

## Elaboration
- [x] ...HD stream meaning: 1920x1080 @ ~30 frames per second and low-latency meaning: delay no higher than 150 milliseconds
- [x] ...while _not_ using Broadway
- [x] ...able to stream live camera feed directly to dozens of web-clients simultaneously and without intermediaries
- [x] ...stream always or stream on activity
- [x] ...configurable sensitivity of motion detection
- [x] ...save motion-sequences (thumbnail and video) to disk
- [x] ...a client should automatically discover all cameras on the network (and show a stream)
- [x] ...ability to signal external programs on activity (or end of), e.g. audio, mail, telegram, ...
- [ ] ...store meta-data of amount of activity in period (graph)
- [ ] ...modern web-client in Svelte

[1] The original one. If it can run on that, it will run on any other.

## Credits to other folks
- Some styling elements and ideas borrowed from https://github.com/arwes/arwes by Romel Pérez

## Projects (partially or fully) in the same vein
- _Motion_  
  The project that made me start this project.  
  https://github.com/Motion-Project/motion
- _Motion (MMAL)_  
  http://wiki.raspberrytorte.com/index.php?title=Motion_MMAL  
- _Motioneye_  
  This is what I _wish_ did what I wanted (depends on Motion)
- _UV4L_  
  Ran into it many years ago for another project, ran into bugs, closed source so could not debug.  
- _Rpisurv_  
  Require multiple device (essentially a camera server)  
  https://github.com/esiexata/rpisurv
- _iSpy_  
  Streaming only.  
  https://github.com/esiexata/iSpy
- _Telepi_  
  Streaming only (and not to web clients)  
  https://github.com/esiexata/telepi
- _Raspivid-stream_  
  Streaming only. Uses Broadway.js  
  https://github.com/pimterry/raspivid-stream
- _Live Player_  
  Streaming only. Uses Broadway.js  
  https://github.com/131/h264-live-player
- _Kerberos_  
  Looks great. I am however unable to get real low-latency stream going.  
  https://kerberos.io
