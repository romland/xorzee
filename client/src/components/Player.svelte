<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Fullscreen from "./Fullscreen.svelte";
	import BroadwayStats, { onNALunit } from "./BroadwayStats.svelte";
	import PolyDraw from "./PolyDraw.svelte";
	import PolyShow from "./PolyShow.svelte";
	import { copyGeography } from "../lib/utils.js";

	import {
		start as startVideoStream
	} from "../lib/stream-video";

	import {
		start as startMotionStream,
		onResize as resizeMotionStream,
		getWebSocket as getMotionWebSocket,
		sendMessage,
	} from "../lib/stream-motion";

	// Set to true if client (the Svelte app) is hosted by localhost but streaming server (Raspi) is not.
	const remoteServer = true;
	const videoStreamPort = 8081;
	const motionStreamPort = 8082;
	const reconnectInterval = 0;// 2000;		// set to 0 for no auto-reconnect

	let settings = null;
	let wsUrl;
	let container;
	let videoPlayer;
	let videoCanvas;
	let motionCanvas;
	let fullScreenState;

	if(remoteServer && window.location.hostname === "localhost") {
		wsUrl = 'ws://192.168.178.67:';
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
	});

	function handleServerMessage(msg)
	{
		if(msg.settings) {
			console.log("Got settings from server");
			settings = msg.settings;
		}

		console.log("handleServerMessage()", msg);
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
			<canvas on:dblclick={ () => toggleFullScreen(onRequest, onExit) } bind:this={motionCanvas}/>

			<div id="polydrawContainer" style="width: 1280px; height: 720px; z-index: 10; position: absolute;">
				{#if drawingIgnoreArea}
					<PolyDraw placeOn={videoCanvas} on:complete={setIgnoreArea}></PolyDraw>
				{:else if settings}
					<PolyShow points={settings.ignoreArea}></PolyShow>
				{/if}
			</div>
		</div>

	</Fullscreen>

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
	}
</style>