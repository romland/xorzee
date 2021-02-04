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

## Working on now
- client: with new video player, multiple cameras are a bit borked (overlaying elements)
- look into if we can mp4-ify on server instead of client (with multiple cameras I do see a bit of client load)
- ditch the whole sci-fi-look attempt -- make it look something like: https://v3demo.mediasoup.org/?roomId=sflbgtdf
- Dig into issue with recording / stop recording not being great
- client: server settings in UI
- client: controls layout, functionality
- client: exiting fullscreen will forget previous size of videoplayer (and thus all elements are of wrong size

## Quick do's
- upgrade systemd package and then actually put it to use
- (keep a flag around for this): if manually started recording -- don't automatically stop it
- name: Xorzee (.com is available)
- make configurable:
	- toggle whether to 'reduce' busy frames
- start on boot
- add "signalSecret" setting (used primarily for 'fetch') -- used so that signals cannot be (as) easily spoofed
- be able to ignore motion processing (ie. just use as 'real time' streamer)
- rename all config options to use camelCase (note, some option names are used on client too!)
- Need better name: call it Aufero?
- set up as service (service file)
	https://thomashunter.name/posts/2016-09-27-running-a-node-js-process-on-debian-as-a-systemd-service
- test if we still need 'reducing' on lots of motion points (with recent optimization, maybe reducing cost more than it gives)
- be able to _not record_ but remember event (a time-stamp will suffice?)
- can definitely increase requirements for 'send only activity' (it sends when there is virtually no activity now)
- report memory and CPU useage to clients
- take screenshots using dispmanx (in camera preview) -- check performance on Zero
	- run camera in preview (does that cost a lot? check) and incorporate dispmanx as screenshotter instead of ffmpeg (e.g. what https://github.com/AndrewFromMelbourne/raspi2png does)
	note: this adds a dependency on libpng: sudo apt-get install libpng12-dev

## TODO
- Stopping recording will incur slow serialization (15ms?) since we transmit a list of latest recordings; client should keep track
- Look into writing a native node module for camera (instead of using pipes)
	limited node module: https://github.com/sandeepmistry/node-raspberry-pi-camera-native
	base on: https://github.com/kclyu/rpi-webrtc-streamer
- Make client an optional electron app (that way, we get control of which video decoder sits on client)
- switch away from Broadway and use something less CPU intensive on clients
	- Either switch to WebRTC on server (webrtc is so painful)
		* https://github.com/nicotyze/Webrtc-H264Capturer
	- Or attempt to package up h264 into something used by video element _on_ client:
	2	* https://github.com/xevojapan/h264-converter (MP4)
	3	* or https://github.com/Streamedian/html5_rtsp_player (RTSP)
	1	* https://github.com/samirkumardas/jmuxer (this one could be massaged into running on raspi too, but it might be expensive?)
	4	* https://github.com/ChihChengYang/wfs.js (mp4)
	5	* https://github.com/goldvideo/demuxer/ (mp4 -- seems to take SPS timings into consideration)
	- Other alternatives (full h264 decoders - so _probably_ not HW decoding):
		https://github.com/oneam/h264bsd
		https://github.com/udevbe/tinyh264 (fork of above, I believe)

- attempt to reduce JSON serializing by generating polygons server side (check which is slower)
- want to have quick access to last few events (maybe a graph showing the last day too)
- want to have statistics how many times signals went off per time-period
- make camera configurable further 
	--qp	quantisation : 0,		// (0) https://www.raspberrypi.org/forums/viewtopic.php?t=175716
			flush : false,			// (false) Flush buffers in order to decrease latency
			slices : 1,				// Horizontal slices per frame
			sharpness				// -100 - 100
			contrast				// -100 to 100
			brightness				// 0 to 100
			saturation				// -100 to 100
			ISO						// ISO
			vstab : false			// video stabilisation
	--ev	evCompoensation			// EV compensation - steps of 1/6 stop
			exposure				// Set exposure mode:
									// off,auto,night,nightpreview,backlight,spotlight,sports,snow,beach,verylong,fixedfps,
									// antishake,fireworks
			flicker					// Set flicker avoid mode:
									// off,auto,50hz,60hz
			awb						// Set AWB mode
									// off,auto,sun,cloud,shade,tungsten,fluorescent,incandescent,flash,horizon,greyworld
	--imxfx	imageEffect				// Set image effect:
									// none,negative,solarise,sketch,denoise,emboss,oilpaint,hatch,gpen,pastel,watercolour,film,
									// blur,saturation,colourswap,washedout,posterise,colourpoint,colourbalance,cartoon
	--colfx	colorEffect				// Set colour effect (U:V)
			metering				// Set metering mode:
									// average,spot,backlit,matrix
			rotation				// Set image rotation (0-359)
	--hflip	horizontalFlip			// Set horizontal flip
	--vflip	verticalFlip			// Set vertical flip
	--roi	regionOfInterest		// Set region of interest (x,y,w,d as normalised coordinates [0.0-1.0])
			shutter					// Set shutter speed in microseconds
	--drc	drcLevel				// Set DRC Level:
									// off,low,med,high
	--analoggain	analogGain		// Set the analog gain (floating point)
	--digitalgain	digitalGain		// Set the digital gain (floating point)
- when streaming only motion, optional config to send an occasional screenshot in place of video? -- click to start video, on demand?
- Write a script to install ffmpeg (and other dependencies, node12?)
- zero is currently slow as a dog -- need some serious optimization work again
- recordings: store (in meta) where motion was during the recorded clip (the tricky thing is the pre-buffer here)
	frame 1: [ points... ]
	frame 2: ...
	- also store magnitude / frame in the meta
- config-option: stream motion only on activity
- if using mp4box -- do I need ffmpeg at all? (or is that a dep of mp4box?)
- recording is a bit too sensitive in these current settings (at least in low-light/night)
- client side simulation of camera annotations
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
- Store timestamps of h264 video (to help with mkvmerge later):
	e.g.:	raspivid -w 1280 -h 1024 -fps 30 -t 10000 -o test.h264 -pts timestamps.txt
			mkvmerge -o bb.mkv --timecodes 0:timestamps.txt test.h264
- Check cost of going from h264 to WebRTC
- when programmatically changing config file on disk, attempt to keep comments in place
- package up server as single binary to minimize installation issues
	e.g.: https://github.com/nexe/nexe
	e.g.: https://dev.to/jochemstoel/bundle-your-node-app-to-a-single-executable-for-windows-linux-and-osx-2c89
	google: https://www.google.com/search?q=package+node+application+to+single+binary
- be able to set motion-sensitivity depending on hour of day (think: when it gets dark, we get more noise)
- make logging to disk configurable
- make a '... | bash' installation script (host on github)
- when reconfiguring camera settings, make sure the cached NAL headers are cleared (otherwise startup time might be really long!)
- Merge doc/notes.txt into README or another .md
- Be able to say "Object needs to enter from <place> and head in <direction>"
- Look into if we can abuse multicast for both stream types (probably not doable in browser, though)
- set up a default pm2 file? do I want to use pm2?

## TODO client
- Send SAD with raw vectors (want to experiment how much SAD differ between frames. 
  Just plot _difference_ as grayscale on raw vector canvas)
- Be able to see recent/latest detected motion sequences in client
- be able to put overlay (timestamp?) on saved stream (not sure how costly this would be)
	(meh, best to just have the player add it as an overlay)
- Stream instead of downloading recorded files...
- view log (if there is one)
- have a slider for sensitivity of motion (this is a bit arbitrary, but I don't really expect everyone to understand all settings)
- output how many clusters and blocks/vectors are currenty active (to be able to easier set sensitivity)
- make 'don't render video/motion when hidden' configurable in client
- button to reconnect websockets
- make configuragle: reconnect sockets on disconnect (just a matter of setting a timeout to non-0)
- be able to specify _no_ ignore area
- do some testing if we need polygon simplifcation on lower-end clients: https://github.com/Serveurperso/line-simplify-rdp
- Streaming only activity and 'don't stream' does not work with jmuxer (yet):
		* streamVideo
		* onlyActivity
- Firefox: if we sit too close to 'duration' of a video, we get stutters, AND there's also a noticable latency
  In Chrome and Edge we are performing (almost?) as great as Broadway.
	Maybe related:
		https://stackoverflow.com/questions/35741233/setting-currenttime-for-html5-video-window-onscroll-is-lagging
		I ran into a similar problem, the issue was the video encoding.
		Having a low video keyframe rate causes the lag.

		My guess is that changing video.currentTime makes the browser's video decoder search for the closest keyframe to the specified time position, and this can take a while on videos with rare keyframes. Reencoding the video with higher keyframe rate fixed the problem for me.

		Note that keyframe spacing can be controled with FFMPEGs -g flag.

	MY NOTE: Sadly this is a bad option for Motion detection as keyframes will give huge motion flashes, I think

	Maybe try a third party player to see if they have any tricks up their sleeves? e.g. https://videojs.com/
- Kerberos.io does look great, see if there are some ideas there that I did not think of!
- Client should keep track of latest recordings and append to it when a recording stops (to reduce JSON encoding server side)

## Misc. Credits
- Some styling elements and ideas borrowed from https://github.com/arwes/arwes by Romel Pérez

## Known bugs (client)
- when reconfiguring resolution, ignore-area does not scale (need to reload to get it shown correctly)

## Known bugs (server)
- something is amiss with StopRecording (we do not stop when we should)
- reconfiguring sometimes fail to restart camera (I'm probably too fast?)

## Projects in same vein...
- https://github.com/Motion-Project/motion Motion :/ -- the project that made me start this project
- http://wiki.raspberrytorte.com/index.php?title=Motion_MMAL A slightly better Motion...
- https://github.com/silvanmelchior/RPi_Cam_Web_Interface (I actually only found out about 
  this one long into my own development (02jan2020) -- it might just be what I need!)
- motioneye, I knew about (which was what I _wish_ did what I wanted)
- uv4l (ran into it many years ago for another project, ran into bugs and it was not open source so could not debug)
- https://github.com/esiexata/rpisurv -- not what I had in mind. You'd need multiple machines (this is a server<->camera solution)
- https://github.com/esiexata/iSpy -- no motion, only a server
- https://github.com/esiexata/telepi -- no motion, requires mplayer on client (need web browser)
- https://github.com/pimterry/raspivid-stream (11jan2020)
- https://github.com/kclyu/rpi-webrtc-streamer - oh wow, this seems to do what I am doing with motion too! (found 11jan2020)
  Haha. It also does mDNS publishing! This is probably what I wanted all along!
- https://github.com/131/h264-live-player
- https://kerberos.io/ -- looks great, but, live stream is not optimal (the camera needs to be configured as 'IP camera')

## Interesting
- https://github.com/esiexata/Camerafeed
	This is interesting because I am curious what algorithm they use to 'keep track' of a person,
	and how expensive it is. My experiences with OpenCV has always been rather underwhelming.
- ditto here: https://github.com/LukashenkoEvgeniy/People-Counter/blob/master/PeopleCounterMain.py
	Again, openCV.
- ditto: https://github.com/kclyu/rpi-webrtc-streamer/blob/master/src/raspi_motionblob.cc
- ditto: (not streaming, but tracking with ... ugh opencv) https://github.com/pageauc/pi-timolo

## Notes
- Running external scripts as signals can be detrimental. There's not much I can do here as spawning
  a process takes anything between 5 and 35 milliseconds. Remember that at 30 FPS on a single core,
  we only have 30 milliseconds and some change. If MotionRuleEngine takes a lot of time when starting
  or stopping recording, the spawn() is the one to blame. Note that I can flag the event-passing as
  async, but at the end of the day, the actual spawning is blocking. The only gain/loss from flagging
  a method leading up to it as async is that you hide where the cost is.
  NOTE: At the moment _sendEvent() in MotionRuleEngine is async, and thus hiding the cost :)
  The (not special) spawn code in question can be found in lib/MotionSignaller.js -> executeScript()

## Maybe future stuff (and ideas)
- support https://www.onvif.org/ (standard) (one implementation here: https://github.com/BreeeZe/rpos )
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
	raspivid: -td, --timed    : Cycle between capture and pause. -cycle on,off where on is record time and off is pause time in ms
	alternatively: just grab from dispmanx (that way we can still detect motion)
- https://github.com/mpromonet/v4l2rtspserver (latency is main worry, investigate)
- off-device object classification: https://aws.amazon.com/rekognition/pricing/
- can i utilize https://github.com/gpujs/gpu.js ?


## Thoughts
- I suppose one _could_ argue that there is no _real_ need to cluster on the server, as long as 
  we can filter out noise and get an idea of whether something is moving (we do a bit more today).
  But since entire h264 stream is sent to client, that one _could_ do clustering by plucking out
  motion vectors in broadway. I do feel the client is burdened enough, already -- and having the
  clusters on server side give some more opportunities.

## Enclosure
- for IR camera + RaspiZero: https://www.thingiverse.com/thing:3239931
	-- well, basically: https://www.thingiverse.com/tag:raspberry_pi_zero_w/page:4 (this is page 4)

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
- https://picamera.readthedocs.io/en/release-1.13/
- Developing against Node 12 (Raspi Zero version here:) https://unofficial-builds.nodejs.org/download/release/v12.16.3/
	- For some reason, could not get it running on the raspi-zero 'pi1in3oled' (or so) -- should probably just reinstall that card
	- on other raspizero i run it fine on node 10
- (cws is breaking for me on later node versions):
	install uws: npm install uWebSockets.js@uNetworking/uWebSockets.js#v18.14.0

## LGTV: Make it put my LG TV to use
### how:
- would like to get more info on capabilities of the (undocumented) websocket protocol; there's 
  more than what we know (and god knows what kind of payload things expect in some cases)
	- can check their apps, e.g.: LG TV Plus -- https://www.lg.com/us/experience-tvs/remote-apps
	- how can I get an android binary to my desktop

	- analyze an Android binary?
		https://mobile-security.gitbook.io/mobile-security-testing-guide/appendix/0x08-testing-tools#apktool


- first make the web-app work on the browser (it seems to fail on phones too)
- find TV
- wake on LAN
- give toast when activity
- stream when activity / return to previous program when activity over
	- alt 1: stream cam directly to tv
	- alt 1: make it picture-in-picture if possible
	- alt 2: open URL in webbrowser (can we open in partial?)

### LGTV: doc/notes
	my tests are on pi19dev05:~/pi
	// 'cast to tv' : upnp and dlna ?
	https://github.com/lillanes/spellcast
	cast to smart tv : https://github.com/search?q=cast+to+smart+tv&type=repositories
	my lg tv does not seem to broadcast itself as a DLNA renderer (?)

	toast icons?: https://github.com/pasnox/oxygen-icons-png/tree/master/oxygen/32x32
	- wake on lan (next)
	// screenshot?! https://www.npmjs.com/package/node-lgtv-api




## How's...
- The stream is h264, that is sent to broadway (i.e. we offload work to client when it comes to the video)

## Misc notes for others
- USB cameras are NOT supported (I don't own any, so cannot test)
- A firewall needs to (by default) open 8080-8082 (TCP)
- install ffmpeg (not in raspbian repositories), binaries available from https://ffmpeg.org/. Choose download / linux / Linux Static Builds. Download the armhf build for newer raspberry pi's. Unarchive and move the created directory somewhere: like to /usr/local. So you will have e.g.: /usr/local/ffmpeg-3.3.2-armhf-32bit-static/.
- create symlinks for /usr/local/ffmpeg-/bin/ffmpeg, ffmpeg-10bit and ffserver into /usr/local/bin.
- installing on a more recent Raspi (arm7):
	curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
	sudo apt-get install -y git nodejs gcc g++ make
	git clone https://github.com/romland/bettermotion.git
	cd bettermotion/client
	npm install
	npm run build (warnings here are okay)
	cd ../server
	npm install
	node index.js

## Since no 32bit UWS by default: building uws
- ditching uWebSockets.js and going with https://www.npmjs.com/package/ws




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
- optionally add (hard) annotations on video stream (they go on recording as well)
- why doesn't *.67 (the dev one) pick up neighbour *.194 (zero) -- (vice versa works) ... huh!
	It is not my code, I think. The announcements from 194 does not show up in avahi-browse either. Weird.
	- So, either avahi is failing me on *.67, or announcing is failing on *.194
	- OK. So this might be because of name collision:
		Received conflicting record [Vidensi\032Jr\.._MintyMint._tcp.local      IN      SRV 0 0 8080 p19dev05.local ; ttl=120] with local record to be. Withdrawing.
- Bonjour: cameras should hand out the 'motionStream' port, not the www port (from motionStream we can get to all other ports)
- make 'Player' component's connection points configurable externally (ground work for multiple servers in one client)
- on 'secondary' servers, we do not connect to video stream...
- output 'server name' on all log statements in Player
- making 'ignore area' does not work correctly with multiple clients
- support strings for signal constants (to be able to make sense of JSON configs): START_RECORDING, EMAIL_SES etc
- don't render motion if we are hidden
- refreshing while scrolled will misplace some elements
- seems when starting/stopping recording, motionrules take up a good 20+ms -- investigate why and presumably fix
	(due to .sh scripts taking a good 5-25ms to start -- not much I can do)
x TODO ( https://github.com/samirkumardas/jmuxer ):
x with or without NAL separator?
x we don't set duration
x how can we set FPS?
x we pass in null for audio
x (!) Missing shims for Node.js built-ins
  Creating a browser bundle that depends on 'stream'. You might need to include https://github.com/ionic-team/rollup-plugin-node-polyfills
x the width/height is now hardcoded, we need to wait for 'settings' before we can set it
x need autoplay on video...
x for now, bring video element to front :( so we can start playing
x when alt-tabbed -- our latency increases (have since enabled (don't stream when document is hidden)
x real dilemma: Since we have overlays on the video you cannot press play (and sadly, cannot count on Autoplay any more :( )
- refactor to make motion the controlling factor -- as it is now, the video channel is controlling
  the size of rendering area
- client: Pass in existing polygon (to PolyDraw) so that it can be modified (as it is now, you just simply start over)
- client: allow movement of vertices in polygon
- replace cws (and uWebsockets.js) with plain 'ws'
