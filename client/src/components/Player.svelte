<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';

	import { copyGeography } from "../lib/utils.js";
	import BroadwayStats, { onNALunit } from "./BroadwayStats.svelte";
	import Fullscreen from "./Fullscreen.svelte";
	import PolyDraw from "./PolyDraw.svelte";
	import PolyShow from "./PolyShow.svelte";
	import ScreenshotList from "./ScreenshotList.svelte";
	import Configuration from "./Configuration.svelte";
	import Controls from "./Controls.svelte";
	import Events from "./Events.svelte";
	import VideoStreamer from "../lib/videostreamer";
	import MotionStreamer from "../lib/motionstreamer";

	export let remoteServer = null;			// Set to true if the client (the Svelte app) is not hosted by this server.
	export let remoteAddress = null;		// This only needs to be set to an address if above is true.
	export let motionStreamPort = null;		// The client needs to get motionStreamPort from the _first_ server it connects to
	export let showOverlayButtons = true;

	const reconnectInterval = 0;// 2000;	// set to 0 for no auto-reconnect

	const dispatch = createEventDispatcher();

	let overlay = {
		"Configuration" : false,
		"ScreenshotList" : false,
		"BroadwayStats" : false,
		"Controls" : false,
	};

	let wsUrl;
	let wwwPort = null;
	let container;
	let videoPlayer;
	let videoCanvas;
	let motionCanvas;
	let fullScreenState;
	let eventsComponent;
	let videoStreamPort;
	let videoStreamer;
	let motionStreamer;
	let polydrawContainer;

	let settings = null;
	let lastRecordings = [];
	let neighbours = [];
	let recording = false;

	let remoteUrl = "";

	// yeah yeah, rename this... it's for development only
	function fiddleWithUrl()
	{
		if(remoteServer && window.location.hostname === "localhost") {
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
		// They all have the same name atm (pulled from git)
		// return `[${(settings ? settings.name : remoteUrl)}]`;
		return `[${remoteUrl}]`;
	}

	function reconfigure(newSettings)
	{
		console.log(sn(), "Got settings from server");
		settings = newSettings;

		wwwPort = settings.wwwport;

		if(motionStreamPort && motionStreamPort !== settings.motionwsport) {
			// motionStreamPort = settings.motionwsport;
			console.error(sn(), "Changing live port of motion stream is not supported");
		}

		fiddleWithUrl();

		if(!videoStreamer.getWebSocket() || (videoStreamPort && videoStreamPort !== settings.videowsport)) {
			videoStreamPort = settings.videowsport;

			if(videoStreamer.getWebSocket()) {
				console.error(sn(), "Reconnect video stream (TODO: disconnect here!)");
				// TODO: Already connected; disconnect video stream
			} else {
				console.log(sn(), "Connect video stream");
			}

			// We start videoStream _after_ motion stream -- since that is where we get the port from.
			videoStreamer.start(wsUrl, videoStreamPort, reconnectInterval, onNALunit, settings.width, settings.height);
		}
	}

	onMount(() => {
		videoStreamer = new VideoStreamer(true, 'auto');
		videoPlayer = videoStreamer.getPlayer();
		videoCanvas = videoPlayer.canvas;
		container.prepend(videoCanvas);

		motionStreamer = new MotionStreamer();
		motionStreamer.start(motionCanvas, videoCanvas, wsUrl, motionStreamPort, reconnectInterval, handleServerMessage);

		new ResizeObserver((elt) => {
			motionStreamer.onResize(motionCanvas, elt[0].target);
			copyGeography(elt[0].target, polydrawContainer);
		}).observe(videoCanvas);

		return () => {
			motionStreamer.stop();
		};
	});

	function handleServerMessage(msg)
	{
		if(msg.settings) {
			reconfigure(msg.settings);
		}

		if(msg.event) {
			handleServerEvent(msg);
		}

		// This can also be in the root of an object (not just an event)
		if(msg.lastRecordings) {
			console.log(sn(), "Got lastRecordings from server");
			lastRecordings = msg.lastRecordings;
		}

		// This is mostly in the root of the object coming from server
		if(msg.neighbours) {
			console.log(sn(), "Got new neighbour list from server");
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
		console.log(sn(), "Got event from server", e);

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

	function windowResized()
	{
		motionStreamer.onResize(motionCanvas, videoCanvas);
		copyGeography(videoCanvas, polydrawContainer);
	}

	function toggleFullScreen(request, exit)
	{
		if(fullScreenState) {
			videoCanvas.style.width = "auto";
			exit();
		} else {
			videoCanvas.style.width = "100%";
			request();
		}
		
		fullScreenState = !fullScreenState;
	}

	let drawingIgnoreArea = false;
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


</script>

	<svelte:window on:resize={windowResized}/>

	<Fullscreen let:onRequest let:onExit>
		<div class="container" bind:this={container}>
			<!-- videoCanvas will be inserted above by Broadway -->
			<canvas bind:this={motionCanvas}/>

			<div on:dblclick={ () => toggleFullScreen(onRequest, onExit) } bind:this={polydrawContainer} style="width: 1280px; height: 720px; z-index: 10; position: absolute;">
				{#if settings}
					<div class="topLeft">
						{wsUrl.replace("ws://192.168.178", "")}
						<Configuration bind:showButton={showOverlayButtons} bind:visible={overlay["Configuration"]} sendMessage={sendMessage} {settings}></Configuration>
						<Controls bind:showButton={showOverlayButtons} bind:visible={overlay["Controls"]} bind:drawingIgnoreArea={drawingIgnoreArea} sendMessage={sendMessage} {settings}></Controls>
						{#if videoPlayer}
							<BroadwayStats bind:showButton={showOverlayButtons} bind:visible={overlay["BroadwayStats"]} player={videoPlayer}></BroadwayStats>
						{/if}
					</div>

					<div class="bottomLeft">
						<ScreenshotList bind:showButton={showOverlayButtons} bind:visible={overlay["ScreenshotList"]} server={remoteUrl} bind:dir={settings.recordpathwww} bind:items={lastRecordings}></ScreenshotList>
						<Events bind:showButton={showOverlayButtons} bind:this={eventsComponent} bind:visible={overlay["Events"]} {settings}></Events>
					</div>
				{/if}

				{#if drawingIgnoreArea}
					<PolyDraw placeOn={videoCanvas} on:complete={setIgnoreArea}></PolyDraw>
				{:else if settings}
					<PolyShow bind:width={settings.width} bind:height={settings.height} points={settings.ignoreArea}></PolyShow>
				{/if}

				<div class="recordingStatus">
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

	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
		width: 100%;
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
		font-size: 30px;
		color: #ff0000;
	}
</style>