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
	import { start as startVideoStream } from "../lib/stream-video";
	import {
		start as startMotionStream,
		stop as stopMotionStream,
		onResize as resizeMotionStream,
		getWebSocket as getMotionWebSocket,
		sendMessage,
	} from "../lib/stream-motion";

	// Set to true if client (the Svelte app) is hosted by localhost but streaming server (Raspi) is not.
	const remoteServer = true;
	// This only needs to be set to an address if above is true.
	const remoteAddress = "192.168.178.67";
	// const remoteAddress = "192.168.178.194";
	const wwwPort = 8080;
	const videoStreamPort = 8081;
	const motionStreamPort = 8082;
	const reconnectInterval = 0;// 2000;		// set to 0 for no auto-reconnect

	let overlay = {
		"Configuration" : false,
		"ScreenshotList" : false,
	};

	let wsUrl;
	let container;
	let videoPlayer;
	let videoCanvas;
	let motionCanvas;
	let fullScreenState;

	let settings = null;
	let lastRecordings = [];
	let recording = false;

	let remoteUrl = "";
	if(remoteServer && window.location.hostname === "localhost") {
		wsUrl = `ws://${remoteAddress}:`;
		remoteUrl = window.location.protocol + "//" + remoteAddress + ":" + wwwPort;
	} else {
		wsUrl = window.location.protocol.replace(/http/, 'ws') + '//' + window.location.hostname + ':';
	}

	onMount(() => {
		videoPlayer = startVideoStream(wsUrl, videoStreamPort, reconnectInterval, true, 'auto', onNALunit);
		videoCanvas = videoPlayer.canvas;
		container.prepend(videoCanvas);

		startMotionStream(motionCanvas, videoCanvas, wsUrl, motionStreamPort, reconnectInterval, handleServerMessage);

		new ResizeObserver((elt) => {
			resizeMotionStream(motionCanvas, elt[0].target);
			copyGeography(elt[0].target, polydrawContainer);
		}).observe(videoCanvas);

		document.addEventListener("visibilitychange", function() {
			console.log("document.hidden", document.hidden)
			if(document.hidden) {
				var notification = new Notification(
					'MintyMint',
					{
						body: "Pausing rendering",
						icon: null
					}
				);
				setTimeout(() => {
					notification.close();
				}, 2000);
			}
		}, false);

		return () => {
			stopMotionStream();
		};
	});

	function handleServerMessage(msg)
	{
		if(msg.settings) {
			console.log("Got settings from server");
			settings = msg.settings;
		}

		if(msg.event) {
			handleServerEvent(msg);
		}

		// This can also be in the root of an object (not just an event)
		if(msg.lastRecordings) {
			console.log("Got lastRecordings from server");
			lastRecordings = msg.lastRecordings;
		}

		if(!msg.event) {
			console.log("handleServerMessage()", msg);
		}
	}


	function handleServerEvent(e)
	{
		console.log("Got event from server", e);

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

	function reconfigureStream()
	{
		sendMessage(
			{
				scope	: "general",
				verb	: "reconfigure",
				data : {
                	"width"				: 1280,
                	"height"			: 720,
                	"framerate"			: 24,
					"bitrate"			: 1700000 / 4,
					"clusterEpsilon"	: 3,
					"clusterMinPoints"	: 2,
					"vectorMinMagnitude": 1,
				}
			}
		);
	}

	function btnRecordStart()
	{
		sendMessage(
			{
				scope	: "record",
				verb	: "start",
			}
		);
	}
	
	function btnRecordStop()
	{
		sendMessage(
			{
				scope	: "record",
				verb	: "stop",
			}
		);
	}

	function windowResized()
	{
		resizeMotionStream(motionCanvas, videoCanvas);
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


	function toggleNotifications()
	{
		if(this.checked) {
			Notification.requestPermission().then(function(result) {
				console.log(result);
			});
		} else {
			// Stop notifications (make a state for this)
		}
	}

	function setIgnoreArea(e)
	{
		console.log("Got ignore area, passing to server:", e.detail.data);

		sendMessage(
			{
				scope	: "motion",
				verb	: "ignore",
				data	: e.detail.data
			}
		);
	}

	let drawingIgnoreArea = false;

</script>

	<svelte:window on:resize={windowResized}/>

	<Fullscreen let:onRequest let:onExit>
		<div bind:this={container}>
			<!-- videoCanvas will be inserted above by Broadway -->
			<canvas bind:this={motionCanvas}/>

			<div on:dblclick={ () => toggleFullScreen(onRequest, onExit) } id="polydrawContainer" style="width: 1280px; height: 720px; z-index: 10; position: absolute;">
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

				{#if settings}
					<Configuration pos="bottom-left"  bind:visible={overlay["screenshots"]} {sendMessage} {settings}></Configuration>
					<ScreenshotList pos="bottom-left" bind:visible={overlay["screenshots"]} server={remoteUrl} bind:dir={settings.recordpathwww} bind:items={lastRecordings}></ScreenshotList>
				{/if}
			</div>
		</div>
	</Fullscreen>

Controls | Statistics

	{#if videoPlayer}
		<BroadwayStats player={videoPlayer}></BroadwayStats>
	{/if}

	<button on:click={btnRecordStart}>Start recording</button>
	<button on:click={btnRecordStop}>Stop recording</button>
	<button on:click={reconfigureStream}>Reconfigure</button>
	<button on:click={() => drawingIgnoreArea = !drawingIgnoreArea}>Toggle adding ignore area</button>
	<input type="checkbox" on:change={toggleNotifications}/>Notifications



<style>
	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
		width: 100%;
	}

	.recordingStatus {
		position: absolute;
		top: 0;
		right: 15px;
		font-size: 30px;
		color: #ff0000;
	}
</style>