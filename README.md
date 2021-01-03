# Better Motion (current name is: MintyMint)
A low-latency, high quality streamer and motion detector. The goal is that it must run on (the) one core of a Raspberry Pi Zero[1].

## Elaboration
- [x] High quality stream meaning: HD (1920x1080) @ 30 FPS.
- [x] ...low-latency meaning: video stream should have delay no higher than 200 milliseconds
- [x] ...able to stream live camera feed to dozens of web-clients simultaneously
- [x] ...ability to only stream video when there is activity
- [x] ...configurable sensitivity of motion detection
- [x] ...set areas of interest for motion detection
- [x] ...save motion-sequences (video) to disk
- [x] ...make thumbnails of motion sequences
- [x] ...discover all other cameras on the network
- [x] ...optionally play audio, invoke remote URL or send mail on activity
- [x] ...optionally signal external programs on activity (or end of)
- [x] ...highly configurable (but sane out of the box)
- [x] ...user interface to draw ignored areas (think: masks in other programs)
- [ ] ...store meta-data of amount of activity in period (graph)
- [ ] ...modern web-client that can handle multiple cameras
- [ ] ...connect to any camera on the network to access _all_ cameras on network
- [ ] ...zero-configuration (that is, image card, connect to network and off we go)

[1] If it can run on that, it will run on any other.


## working on
- take screenshots using dispmanx (in camera preview) -- check performance on Zero
- object detection ... maybe
- something is amiss with StopRecording (we do not stop when we should)


## Quick do's
- add "signalSecret" setting (used primarily for 'fetch') -- used so that signals cannot be (as) easily spoofed
- be able to ignore motion processing (ie. just use as 'real time' streamer)
- rename all config options to use camelCase
- Need better name: call it Aufero?
- make a '... | bash' script (host on github)
- set up a service (service file)
- Merge doc/notes.txt into README or another .md
- recordings: store (in meta) where motion was during the recorded clip (the tricky thing is the pre-buffer here)
	frame 1: [ points... ]
	frame 2: ...
	- also store magnitude / frame in the meta
- Write a small script to install ffmpeg
- test if we still need 'reducing' on lots of motion points (with recent optimization, maybe reducing cost more than it gives)
- be able to _not record_ but remember event (a time-stamp will suffice?)
- support strings for signal constants (to be able to make sense of JSON configs): START_RECORDING, EMAIL_SES etc
- make the camera flips configurable
- make brightness, contrast, etc configurable
- can definitely increase requirements for 'send only activity' (it sends when there is virtuall no activity now)


## TODO
- run camera in preview (does that cost a lot? check) and incorporate dispmanx as screenshotter instead of ffmpeg (e.g. what https://github.com/AndrewFromMelbourne/raspi2png does)
- ability to set an 'on' schedule (for signals and recording)
- split 'signals' up into one signal per file (perhaps make signals-available and signals-enabled directories)
- flesh out 'activity mails':
	- template-vars for subject and body
	- attach screenshot if 'on stop recording'
	- make a good looking default template for the body
	- saw some logging being off when sending SES mail
- 'filtervectors' takes like 40ms on Raspi Zero and 7ms on Raspi3B (need to get that down to sub-20 on the Zero)
- Rewrite/ditch avahi-dbus
- measure disk speed (to see if SD card) as to whether to record things by default
- test ffmpeg encoding on gpu (for scaling downwards -- can we get away with it on multiple cores?)
- add additional 'signals': telegram
- biggest dilemma: CPU useage on client, need to minimize that somehow since I will want multiple cameras.
	- Reducing resolution is no good as it gives us fewer macro blocks
	- Reducing bitrate is not great as it affects recordings and restarting camera with new settings takes long
- (a signal, actually): send event over bonjour when auto-record starts?
	- broadcast a message when there is movement on a camera so that any watching client can pick that up and show it
		- (seems updating the TXT record of a service is the way to go?)
			https://stackoverflow.com/questions/5747692/avahi-broadcast-that-my-service-has-updated-information
		- In java, but seems pretty clear:
			https://github.com/Andymann/tcpSyphonServer_Java/blob/26b8c21916067d1ac3cd8ead16ce307a5e701360/_externalJar/avahi/avahi4j/src/avahi4j/examples/TestServicePublish.java
	- For 'stream only when activity', use motion-stream for that ... or possibly bonjour?
- Auth: Protect websockets? / also: to be able to change server settings
- Be able to say how much disk-space can bse used for recordings (delete oldest)
	- Delete oldest videos if running out of disk-space
- Actually write logs to disk? Or let something like PM2 handle that?
- At high frame-rate, merge several motion frames into one to easier detect motion (?)
- refactor/move all the motion processing from MotionListener to MotionSender
- Write a script to configure basics (just set a unique name should do it?) -- allow this in client too
- Be able to upload files via http 
- SMB should come for free, perhaps provide some configuration options for some common NAS(s)?

## TODO client
- Be able to see recent/latest detected motion sequences in client
- be able to put overlay (timestamp?) on saved stream (not sure how costly this would be)
	(meh, best to just have the player add it as an overlay)
- Stream instead of downloading recorded files...
- view log

## Check out
- 02jan2020: https://github.com/silvanmelchior/RPi_Cam_Web_Interface (I actually only found out about 
  this one long into my own development -- it might just be what I need!)
- motioneye, I knew about (which was what I _wish_ did what I wanted)


## Maybe future stuff (and ideas)
- test if client works on my LG TV (I have my doubts!)
- be able to specify overlay over a camera (top-left, top-right, bottom-left, bottom-right)
- telegram support:
	https://gist.github.com/Sinequanonh/f5625a2807f89ce4f6634cd3b1ab65a0
- be able to stream recordings to remote location (if failure, store locally)
- be able to store recordings in RAM (until out of memory)
- Port MvrProcessor to a native node module (C/C++)
- I'd like object-identification _without extra hardware_ (we will only identify _moving_ objects -- e.g. human/cat/dog)
  (google: does yolo use motion vectors) A: is no, but seems like other thought of the same (no surprise)
- Would be nice to be able to use 'down-time' to containerize the h264 files (too much to ask for perhaps?)
	see: https://github.com/gpac/gpac/wiki/MP4Box
- Change: Curently using deprecated @clusterws/cws (testing on 32bit arm72 -- no prebuilt uWs there)
- Would be nice to remap fisheye live (it should be somewhat parallellizable and could go on GPU?)
- "Beam" to TV:
	https://connectsdk.readthedocs.io/en/latest/fundamentals/supported-feature.html
	(seems to be some node packages)
	- primary concern for me is that I want to switch back to 'previous mode' (e.g. TV) after streaming a clip
- Recording simulation should be moved into Recorder actually (realized this late as it propagated outside of MotionRuleEngine)
- get rid of 'bl'?
- screenshots / videos on github (ugh)
- timelapse? not too interested in it myself tbh

## Thoughts
- I suppose one _could_ argue that there is no _real_ need to cluster on the server, as long as 
  we can filter out noise and get an idea of whether something is moving (we do a bit more today).
  But since entire h264 stream is sent to client, that one _could_ do clustering by plucking out
  motion vectors in broadway. I do feel the client is burdened enough, already -- and having the
  clusters on server side give some more opportunities.

## Enclosure
- for IR camera + RaspiZero: https://www.thingiverse.com/thing:3239931
	-- well, basically: https://www.thingiverse.com/tag:raspberry_pi_zero_w/page:4 (this is page 4)

## Known bugs
- when reconfiguring resolution, ignore-area does not scale (need to reload to get it shown correctly)
- reconfiguring sometimes fail to restart camera (I'm probably too fast?)

## Misc notes for myself now
- For Avahi DBUS API:
	- You can see them in the avahi-daemon source directory, named *.introspect.
	  (does not seem to be called .introspect any more, but merely .xml?)
	  https://github.com/lathiat/avahi/tree/master/avahi-daemon
	
	- This seems to not have interfaces implemented:
	  https://github.com/lathiat/avahi/blob/d1e71b320d96d0f213ecb0885c8313039a09f693/avahi-daemon/org.freedesktop.Avahi.EntryGroup.xml
	  (I want to get at AddService)


- Note to self: Stop Vidensi recorder on my test device (or camera is booked!)
- Note: Uses broadway: https://github.com/mbebenita/Broadway
- support USB for camera (pipe through socat?)
- to stream a video, pipe in e.g.: ffmpeg -re -i foo.mp4 -c:v copy -f h264 udp://localhost:8000 (tcp in our case atm)
- Broadway only supports h264 baseline, no audio (don't go fancy)

## How's...
- The stream is h264, that is sent to broadway (i.e. we offload work to client when it comes to the video)

## Misc notes for others
- USB cameras are NOT supported (I don't own any, so cannot test)
- A firewall needs to (by default) open 8080-8082 (TCP)
- install ffmpeg (not in raspbian repositories), binaries available from https://ffmpeg.org/. Choose download / linux / Linux Static Builds. Download the armhf build for newer raspberry pi's. Unarchive and move the created directory somewhere: like to /usr/local. So you will have e.g.: /usr/local/ffmpeg-3.3.2-armhf-32bit-static/.
- create symlinks for /usr/local/ffmpeg-/bin/ffmpeg, ffmpeg-10bit and ffserver into /usr/local/bin.

# Done
- add 'trigger areas' (polygons)
- restart camera with different resolution -- how much time does it take?
- want to announce presence on bonjour when starting up (so we don't have to copy files on install)
- start with auto-recording
- Write the client using Svelte (very plain atm)
- make 'sending raw' configurable under advanced settings (default false)
- test: maybe simply not stream video if there is no motion? How will Broadway handle that?
- Remove 'http-server' dep on server
- clear up misc directory
- biggest issue right now:
	- filterVectors / clustering on busy frames take too long for a poor RaspiZero. Will need to 
	  optimize before continuing with features.
	- need a good reproducable(-ish) way to measure improvements (easy way: just measure 1k frames
	  and avg. cost?)
- lib/MotionSignaller.js
- send 'event' to remote URL (must include secret below)
- a few default signals:
	- play a sound
	- mail an address
- nice optimization: make a lookup table for point-in-polygon in MvrProcessor
- render overlay every frame (to facilitate animations)
- Option to not stream video (and only stream when there is activity) -- can still stream motion
