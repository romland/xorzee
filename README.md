# Xorzee
A low-latency, HD video streamer and motion detector. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

## Elaboration
- [x] ...HD stream meaning: 1920x1080 @ ~30 frames per second.
- [x] ...low-latency meaning: video stream should have delay no higher than 150 milliseconds
- [x] ...while _not_ using Broadway
- [x] ...able to stream live camera feed to dozens of web-clients simultaneously
- [x] ...stream directly from device to multiple clients (no intermediaries)
- [x] ...ability to only stream video when there is activity
- [x] ...configurable sensitivity of motion detection
- [x] ...save motion-sequences (video) to disk
- [x] ...make thumbnails of motion sequences
- [x] ...discover all other cameras on the network
- [x] ...optionally play audio, invoke remote URL or send mail on activity
- [x] ...optionally signal external programs on activity (or end of)
- [x] ...user interface to draw ignored areas (think: masks in other programs)
- [x] ...configurable stream overlays
- [x] ...multiple cameras in web-clients
- [x] ...connect to any camera on the network to automatically view _all_ cameras on network
- [ ] ...store meta-data of amount of activity in period (graph)
- [ ] ...modern web-client in Svelte
- [x] ...and quite a bit more

[1] If it can run on that, it will run on any other.

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
