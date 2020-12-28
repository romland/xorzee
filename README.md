# Better Motion (current name is: MintyMint)
A fast, high quality streamer and motion detector. It must run on the one core of a Raspberry Pi Zero [1].

[1] If it can run on that, it will run on any other Raspberry Pi.

## Elaboration
- High quality stream meaning: 1920x1080 @ 30 FPS.
- Should be able to stream live camera feed to dozens of clients simultaneously
- Should not have a delay higher than 0.2 seconds
- Should have configurable sensitivity of motion detection
- Should be able to set areas of interest for motion detection
- Should be able to save motion-sequences (video) to disk
- Should be able to make thumbnails of of motion sequences
- Should have a client which can deal with multiple cameras
- Should automatically find other cameras on the network
- Should be able to signal external programs on activity
- Should be zero-configuration (that is, install software, connect to network and go)
- Should be highly configurable
- It should be as close to power-on-and-aim-camera-and-go as possible
- Should have a modern web-client that can handle multiple cameras
- Clients should be able to connect to any camera on the network and then also see all other available cameras
- Should be able to only stream video when there is activity
- Should be able to detect neighbouring cameras live (and pass on to client as they come available)

## TODO now
- what i want to do now:
	- broadcast a message when there is movement on a camera so that any watching client can pick that up and show it
		- (seems updating the TXT record of a service is the way to go?)
			https://stackoverflow.com/questions/5747692/avahi-broadcast-that-my-service-has-updated-information
		- In java, but seems pretty clear:
			https://github.com/Andymann/tcpSyphonServer_Java/blob/26b8c21916067d1ac3cd8ead16ce307a5e701360/_externalJar/avahi/avahi4j/src/avahi4j/examples/TestServicePublish.java
- restart camera with different resolution -- how much time does it take?
- want to announce presence on bonjour when starting up (so we don't have to copy files on install)
- start with auto-recording
- send event over bonjour when auto-record starts?


## Future stuff (ideas)
- be able to stream recordings to remote location (if failure, store locally)
- Port MvrProcessor to a native node module (C/C++)
- Write the client using Svelte (very plain atm)
- Be able to see recent/latest detected motion sequences in client
- I'd like object-identification _without extra hardware_ (we will only identify _moving_ objects -- e.g. human/cat/dog)
  (google: does yolo use motion vectors) A: is no, but seems like other thought of the same (no surprise)
- Would be nice to be able to use 'down-time' to containerize the h264 files (too much to ask for perhaps?)
- be able to put overlay (timestamp?) on saved stream (not sure how costly this would be)
- Change: Curently using deprecated @clusterws/cws (testing on 32bit arm72 -- no prebuilt uWs there)
- Would be nice to remap fisheye live (it should be somewhat parallellizable and could go on GPU?)
- For 'stream only when activity', use motion-stream for that ... or possibly bonjour?
- Stream instead of downloading recorded files...
- Write a small script to install ffmpeg
- Write a small script to configure basics (just set a unique name should do it?) -- allow this in client too
- Auth: Protect websockets?
- Auth: To be able to change server settings
- "Beam" to TV:
	https://connectsdk.readthedocs.io/en/latest/fundamentals/supported-feature.html
	(seems to be some node packages)
	- primary concern for me is that I want to switch back to 'previous mode' (e.g. TV) after streaming a clip
- Be able to say how much disk-space can bse used for recordings (delete oldest)
- Delete oldest videos if running out of disk-space
- At high frame-rate, merge several motion frames into one to easier detect motion (?)

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
- support UDB for camera (pipe through socat?)
- to stream a video, pipe in e.g.: ffmpeg -re -i foo.mp4 -c:v copy -f h264 udp://localhost:8000 (tcp in our case atm)
- Broadway only supports h264 baseline, no audio (don't go fancy)

## How's...
- The stream is h264, that is sent to broadway (i.e. we offload work to client when it comes to the video)

## Misc notes for others
- A firewall needs to (by default) open 8080-8082 (TCP)
- install ffmpeg (not in raspbian repositories), binaries available from https://ffmpeg.org/. Choose download / linux / Linux Static Builds. Download the armhf build for newer raspberry pi's. Unarchive and move the created directory somewhere: like to /usr/local. So you will have e.g.: /usr/local/ffmpeg-3.3.2-armhf-32bit-static/.
- create symlinks for /usr/local/ffmpeg-/bin/ffmpeg, ffmpeg-10bit and ffserver into /usr/local/bin.

