# Better Motion (current name is: MintyMint)


## The goal
A fast, high quality streamer and motion detector. It must run on the one core of a Raspberry Pi Zero [1].

[1] If it can run on that, it will run on any other Raspberry Pi.

## Elaboration
- High quality stream meaning: 1920x1080 @ 30 FPS.
- Should be able to stream live camera feed to dozens of clients simultaneously
- Should not have a delay higher than 0.2 seconds
- Should have configurable sensitivity of motion detection
- Should be able to set areas of interest for motion detection
- Should be able to trigger external scripts on detected motion
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

## Later
- Port MvrProcessor to a native node module (C/C++)


## Future features (ideas)
- Be able to see recent/latest detected motion sequences in client
- I'd like object-identification _without extra hardware_ (we will only identify _moving_ objects -- e.g. human/cat/dog)
  (google: does yolo use motion vectors) A: is no, but seems like other thought of the same (no surprise)
- Would be nice to be able to use 'down-time' to containerize the h264 files (too much to ask for perhaps?)
- be able to put overlay (timestamp?) on saved stream (not sure how costly this would be)
- Change: Curently using deprecated @clusterws/cws (testing on 32bit arm72 -- no prebuilt uWs there)


## Misc notes for myself now
- Note to self: Stop Vidensi recorder on my test device (or camera is booked!)
- Note: Uses broadway: https://github.com/mbebenita/Broadway
- support UDB for camera (pipe through socat?)
- to stream a video, pipe in e.g.: ffmpeg -re -i foo.mp4 -c:v copy -f h264 udp://localhost:8000 (tcp in our case atm)
- Broadway only supports h264 baseline, no audio (don't go fancy)

## How's...
- The stream is h264, that is sent to broadway (i.e. we offload work to client when it comes to the video)

## Misc notes for others
- A firewall needs to (by default) open 8080-8082 (TCP)
