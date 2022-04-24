<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';

	import { updateAllGeography, followGeography, addGeographyFollower } from "../lib/utils.js";
	import StreamStats, { onNALunit } from "./StreamStats.svelte";
	import Fullscreen from "./Fullscreen.svelte";
	import PolyDraw from "./PolyDraw.svelte";
	import ScreenshotList from "./ScreenshotList.svelte";
	import Configuration from "./Configuration.svelte";
	import Controls from "./Controls.svelte";
	import Events from "./Events.svelte";
	import VideoStreamer from "../lib/videostreamer";
	import MotionStreamer from "../lib/motionstreamer";
	import Button from './Button.svelte';

	export let remoteServer = null;			// Set to true if the client (the Svelte app) is not hosted by this server.
	export let remoteAddress = null;		// This only needs to be set to an address if above is true.
	export let motionStreamPort = null;		// The client needs to get motionStreamPort from the _first_ server it connects to
	export let showOverlayButtons = true;
	export let playerWidth = null;			// Size of one player -- _must_ be passed in

	const reconnectInterval = 0;// 2000;	// set to 0 for no auto-reconnect

	const dispatch = createEventDispatcher();

	let overlay = {
		"Configuration" : false,
		"ScreenshotList" : false,
		"StreamStats" : false,
		"Controls" : false,
	};

	let wsUrl;
	let wwwPort = null;
	let container;
	let videoPlayer;
	let motionCanvas;
	let fullScreenState;
	let eventsComponent;
	let videoStreamPort;
	let videoStreamer;
	let motionStreamer;
	let polydrawContainer;

	let drawingIgnoreArea = false;

	let settings = null;
	let settingsMeta = null;
	let lastRecordings = [];
	let neighbours = [];
	let recording = false;

	let remoteUrl = "";

	let videoContainer;
	let motionContainer;
	let crispVideo;
	let videoFontSize = 30;

	// yeah yeah, rename this... it's for development only
	function fiddleWithUrl()
	{
		if(remoteServer && (window.location.hostname === "localhost" || window.location.hostname === "192.168.178.100")) {
			// Initial server is NOT on same host as client
			wsUrl = `ws://${remoteAddress}:`;
			remoteUrl = window.location.protocol + "//" + remoteAddress + ":" + wwwPort;
		} else {
			wsUrl = window.location.protocol.replace(/http/, 'ws') + '//' + window.location.hostname + ':';
		}
	}

	fiddleWithUrl();


	// Server name, used for debugging
	function sn()
	{
		// They [all clients] all have the same name atm (their configs are pulled from git)
		// return `[${(settings ? settings.name : remoteUrl)}]`;
		return `[${remoteUrl}]`;
	}

	function reconfigure(newSettings)
	{
		console.log(sn(), "Got (new) settings from server", newSettings);
		settings = newSettings;

		wwwPort = settings.wwwPort;

		if(motionStreamPort && motionStreamPort !== settings.motionWsPort) {
			// motionStreamPort = settings.motionWsPort;
			console.error(sn(), "Changing live port of motion stream is not supported (as we need to restart server _and_ client socket)");
		}

		fiddleWithUrl();

		if(!videoStreamer) {
			/*
			* Alternatives:
			*	jmuxer:		Video latency of about 1 second in Firefox (motion is live). Chrome/Edge are live-ish.
			*	broadway:	Truly live, expensive to render for client
			*	serverjmuxer: jmuxer, but let it be done on server
			*/
			videoStreamer = new VideoStreamer(true, 'auto', settings.width, settings.height, (settings.serverSideMuxing ? 'serverjmuxer' : 'jmuxer'));
			videoPlayer = videoStreamer.getPlayer();
			videoContainer.prepend(videoPlayer.canvas);
			addGeographyFollower(
				motionCanvas,
				videoContainer,
				[ (w,h,o) => {
					// This is called when motionCanvas changes
					// We need to give container a physical size since everything in it absolute positioned.
					container.style.height = h;
					container.style.width = w;
					
					videoFontSize = Math.min(o.getBoundingClientRect().width / 20, 30);
				}]
			);
			addGeographyFollower(
				motionCanvas,
				motionContainer
			);

			motionStreamer.setVideoSize(settings.width, settings.height);
		}

		if(settings.width !== newSettings.width || settings.height !== newSettings.height) {
			motionStreamer.setVideoSize(settings.width, settings.height);
		}

		if(!videoStreamer.getWebSocket() || (videoStreamPort && videoStreamPort !== settings.videoWsPort)) {
			videoStreamPort = settings.videoWsPort;

			if(videoStreamer.getWebSocket()) {
				console.error(sn(), "Reconnect video stream (TODO: disconnect here!)");
				// TODO: Already connected; disconnect video stream
			} else {
				console.log(sn(), "Connect video stream");
			}

			// We start videoStream _after_ motion stream -- since that is where we get the port from.
			videoStreamer.start(wsUrl, videoStreamPort, reconnectInterval, onNALunit, settings.frameRate);
		}
	}

	onMount(() => {
		motionStreamer = new MotionStreamer();
		motionStreamer.start(motionCanvas, wsUrl, motionStreamPort, reconnectInterval, handleServerMessage);
		followGeography(motionCanvas, [ polydrawContainer ]);

		return () => {
			motionStreamer.stop();
		};
	});

	/**
	 * Misc. status messages we get from server. One such example is
	 * that server might be recording when we first connect, so we 
	 * never actually saw a "start recording" event. Server will pass 
	 * a 'status' in greeting this purpose. But can be used to pass
	 * any status at any point.
	 */
	function serverStatusUpdate(status)
	{
		console.log("Got status", status);
		if(status.recording !== undefined) {
			recording = status.recording;
		}
	}

	function handleServerMessage(msg)
	{
		if(msg.settings) {
			if(msg.settingsMeta) {
				settingsMeta = msg.settingsMeta;
			}

			reconfigure(msg.settings);
		}

		if(msg.event) {
			handleServerEvent(msg);
		}

		if(msg.status) {
			serverStatusUpdate(msg.status)
		}

		// This can also be in the root of an object (not just an event)
		if(msg.lastRecordings) {
			console.log(sn(), "Got lastRecordings from server");
			lastRecordings = msg.lastRecordings;
		}

		// This is mostly in the root of the object coming from server
		if(msg.neighbours) {
			// console.log(sn(), "Got new neighbour list from server");
			neighbours = msg.neighbours;

			dispatch('neighbourChange', {
				data : neighbours
			});
		}

		if(!msg.event) {
			console.log(sn(), "handleServerMessage()", msg);
		}
	}


	function handleServerEvent(e)
	{
		// console.log(sn(), "Got event from server", e);

		if(eventsComponent) {
			eventsComponent.newEvent(e);
		}

		switch(e.event) {
			case "startRecordingMotion":
				recording = true;
				break;
			case "stopRecordingMotion":
				recording = false;
				break;
			case "lastRecordings":
				lastRecordings = e.data;
				break;
		}
	}

	function sendMessage(message)
	{
		motionStreamer.sendMessage(message);
	}

	/**
	 * Since we cannot detect when someone pressed escape
	 * while in full-screen, do this to attempt to restore
	 * ourselves to a good situation.
	 */
	function onFullScreenChange(ev)
	{
		if(ev.detail.current === false && (motionContainer.style.width === screen.width + "px")) {
			console.log("Got out of fullscreen. Fixing...");
			fullScreenState = false;
			motionContainer.style.width = playerWidth;
			updateAllGeography();
		}
	}

	// This works because it acts on the element that is 'primary' when using followGeography()
	function toggleFullScreen(requestFullscreen, exitFullscreen)
	{
		if(drawingIgnoreArea) {
			return;
		}

		if(fullScreenState) {
			// coming back from full screen (note that onFullScreenChnage event will restore size of window.
			exitFullscreen();
		} else {
			requestFullscreen();
			motionContainer.style.width = screen.width + "px";
			updateAllGeography();
		}

		fullScreenState = !fullScreenState;
	}

	function setIgnoreArea(e)
	{
		console.log(sn(), "Got ignore area, passing to server:", e.detail.data);

		sendMessage(
			{
				scope	: "motion",
				verb	: "ignore",
				data	: e.detail.data
			}
		);
	}


	function onLayerChange(componentName, e)
	{
		console.log("onLayerChange", componentName);
		for(let k in overlay) {
			if(k === componentName) {
				continue;
			}
			overlay[k] = false;
		}
	}

	function toggleLayer(layerName)
	{
		if(overlay[layerName] === false) {
			onLayerChange(layerName, null);
		}
		overlay[layerName] = !overlay[layerName];
	}

	// for when autoplay does not trigger :/
	function play(ev)
	{
		dispatch('playAll', {
			data : ev
		});
	}

	// Crisp video toggle
	$:	if(videoPlayer && videoPlayer.canvas) {
			if(crispVideo === true) {
				videoPlayer.canvas.classList.add("crispVideo");
				// motionCanvas.classList.add("crispVideo");
			} else {
				videoPlayer.canvas.classList.remove("crispVideo");
				// motionCanvas.classList.remove("crispVideo");
			}
		}

	// ========= zoom related stuff, TODO: refactor away somehow =========
	const startDrag = {
		x: 0,
		y: 0,
		ts: 0
	};
	let zoomSvg, zoomRect;
	const zoomed = {
		active : false,
		scale : 1,
		pos : {
			x: 0,
			y: 0
		}
	};

	function resetZoom()
	{
		if(!zoomed.active) {
			return;
		}

		zoomed.active = false;

		const videoElt = container.getElementsByTagName("video")[0];
		if(!videoElt) {
			console.error("No video element...");
			return;
		}

		videoElt.style.transform = "translate(0px, 0px) scale(1)";
		motionCanvas.style.transform = "translate(0px, 0px) scale(1)";
		videoElt.classList.remove("liveVideoPlayer");
	}

	function getMousePos(e)
	{
		const rect = polydrawContainer.getBoundingClientRect();
		return {
			// Round because we get fuzzy sub-pixel offsets if the element is scaled or zoomed in.
			x :	Math.round(e.pageX - rect.left),
			y :	Math.round(e.pageY - rect.top)
		};
	}

	function mouseMove(e)
	{
		if(startDrag.ts === 0) {
			return;
		}

		const pos = getMousePos(e);

		if(pos.x === startDrag.x && pos.y === startDrag.y) {
			return;
		}

		zoomSvg.setAttribute("width", pos.x - startDrag.x);
		zoomSvg.setAttribute("height", pos.y - startDrag.y);
		zoomSvg.style.left = startDrag.x + "px";
		zoomSvg.style.top = startDrag.y + "px";
	}

	function mouseDown(e)
	{
		if(e.which !== 1 || e.target.tagName === "INPUT") {
			return;
		}

		const pos = getMousePos(e);
		startDrag.ts = Date.now();
		startDrag.x = pos.x;
		startDrag.y = pos.y;

		if(zoomed.active === true) {
			resetZoom();
		}
	}

	function mouseUp(e)
	{
		zoomSvg.setAttribute("height", 0);
		zoomSvg.setAttribute("width", 0);

		if((Date.now() - startDrag.ts) < 250 || e.which !== 1 || e.target.tagName === "INPUT") {
			startDrag.ts = 0;
			console.log("Zoom ignored");
			return;
		}

		startDrag.ts = 0;

		const pos = getMousePos(e);

		if(pos.x === startDrag.x && pos.y === startDrag.y) {
			return;
		}

		// Not bindable with Svelte as its constructed runtime, to plain old DOM we go...
		const videoElt = videoContainer.getElementsByTagName("video")[0];
		if(!videoElt) {
			console.error("No video element...");
			return;
		}

		const surface = container.getBoundingClientRect();
		const rectW = pos.x - startDrag.x;
		const rectH = pos.y - startDrag.y;
		const rectC = { x : (startDrag.x + (rectW/2)), y : (startDrag.y + (rectH/2)) };
		const surfaceC = { x : surface.width/2, y : surface.height/2 };
		const zoomLevel = Math.min((surface.width / rectW), (surface.height / rectH));

		videoElt.style.transform = "translate(" + ((surfaceC.x - rectC.x)*zoomLevel) + "px, " + ((surfaceC.y - rectC.y)*zoomLevel) + "px)  scale(" + zoomLevel + ")";
		motionCanvas.style.transform = videoElt.style.transform;
		videoElt.classList.add("liveVideoPlayer");
		zoomed.active = true;
	}

	// Reset zoom if player changes size.
	// It's a bit of a cop out, I'd rather prefer that the zoom is kept, 
	// but there are a few bugs around that. Comment out these three lines
	// and just debug if you are up for it.
$:	if(container && playerWidth) {
		resetZoom();
	}

</script>
	<Fullscreen let:onRequest let:onExit on:change={(ev)=>onFullScreenChange(ev)}>
		<div class="container" bind:this={container}>
			<!-- If Broadway renderer is used: 'videoCanvas' (can also be a video player) will be inserted above -->
			<div class="layerContainer" bind:this={videoContainer}>
			</div>
			
			<div class="layerContainer" bind:this={motionContainer} style="width: {playerWidth};">
				<canvas bind:this={motionCanvas} class="motionCanvas" style="width: 100%;"/>
			</div>

			<div
				class="containerOverlays"
				on:dblclick={ () => toggleFullScreen(onRequest, onExit) }
				bind:this={polydrawContainer}
				on:mousemove={mouseMove}
				on:mousedown={mouseDown}
				on:mouseup={mouseUp}
			>
				<!-- zoom rectangle -->
				<svg style="position: absolute; opacity: 0.6;" bind:this={zoomSvg} width="0" height="0">
					<rect bind:this={zoomRect} width="100%" height="100%" style="fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0)" />
				</svg>

				{#if settings}
					<div class="topLeft">
						<Controls
							on:message={(e)=>onLayerChange("Controls", e)}
							toggleLayer={toggleLayer}
							bind:showButton={showOverlayButtons}
							bind:visible={overlay["Controls"]}
							bind:drawingIgnoreArea={drawingIgnoreArea}
							sendMessage={sendMessage}
							bind:crispVideo={crispVideo}
							bind:settings={settings}>
						</Controls>

						<Button label={""} icon={"open_in_full"} style="square" on:click={ () => toggleFullScreen(onRequest, onExit) }></Button>

						<Configuration
							on:message={(e)=>onLayerChange("Configuration", e)}
							bind:showButton={showOverlayButtons}
							bind:visible={overlay["Configuration"]}
							sendMessage={sendMessage}
							bind:settings={settings}
							bind:settingsMeta={settingsMeta}>
						</Configuration>

						<ScreenshotList 
							on:message={(e)=>onLayerChange("ScreenshotList", e)}
							bind:showButton={showOverlayButtons}
							bind:visible={overlay["ScreenshotList"]}
							server={remoteUrl}
							bind:dir={settings.recordPathWww}
							bind:items={lastRecordings}>
						</ScreenshotList>

						<Events
							on:message={(e)=>onLayerChange("Events", e)}
							bind:showButton={showOverlayButtons}
							bind:this={eventsComponent}
							bind:visible={overlay["Events"]}>
						</Events>

						<!-- No longer needed as it will autoplay if no audio
							<Button bind:visible={showOverlayButtons} label="Play" on:click={play}></Button>
						-->
					</div>

					<div class="bottomLeft">
						{#if videoPlayer}
							<StreamStats 
								on:message={(e)=>onLayerChange("StreamStats", e)} 
								bind:showButton={showOverlayButtons} 
								bind:visible={overlay["StreamStats"]} 
								player={videoPlayer}>
							</StreamStats>
						{/if}
					</div>

					<PolyDraw
						bind:drawing={drawingIgnoreArea}
						bind:width={settings.width}
						bind:height={settings.height}
						currentPoints={settings.ignoreArea}
						on:complete={setIgnoreArea}>
					</PolyDraw>
				{/if}

				<div class="recordingStatus" style="font-size: {videoFontSize}px;">
					{#if recording}
						<span in:fade out:fade>⬤ REC</span>
					{/if}
				</div>
			</div>
		</div>
	</Fullscreen>

<style>
	.container {
		user-select: none;
  	}
	
	.containerOverlays {
		position: absolute;
	}

	.motionCanvas {
		position: absolute;
		transform-origin: center center 0px;
		transform: translate(0px, 0px) scale(1);
	}

	.topLeft {
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
	}

	.bottomLeft {
		position: absolute;
		bottom: 0;
		display: flex;
	}

	/* essentially topRight */
	.recordingStatus {
		position: absolute;
		top: 0;
		right: 15px;
/*		font-size: 30px;*/
		color: #ff0000;
	}

	.layerContainer {
		overflow:hidden;
		position:absolute;
	}
</style>