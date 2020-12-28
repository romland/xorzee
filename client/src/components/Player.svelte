<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Fullscreen from "./Fullscreen.svelte";
	import BroadwayStats, { onNALunit } from "./BroadwayStats.svelte";

	import {
		start as startVideoStream
	} from "../lib/stream-video";

	import {
		start as startMotionStream,
		onResize as resizeMotionStream,
		getWebSocket as getMotionWebSocket,
		sendMessage,
	} from "../lib/stream-motion";

	// http://82.74.2.185:8080

	// Set to true if client (the Svelte app) is hosted by localhost but streaming server (Raspi) is not.
	const remoteServer = true;
	const vPort = 8081;
	const oPort = 8082;

	// The size of this does not really matter other than preventing a 'flash-before-render'.
	const containerId = "video"+Date.now();

	let container;
	let videoPlayer;
	let fullScreenState;
	let videoCanvas;
	let motionCanvas;
	let wsUrl;

	if(remoteServer && window.location.hostname === "localhost") {
		wsUrl = 'ws://192.168.178.67:';
	} else {
		wsUrl = window.location.protocol.replace(/http/, 'ws') + '//' + window.location.hostname + ':';
	}

	onMount(() => {
		videoPlayer = startVideoStream(
			wsUrl,
			vPort,
			2000,	// reconnect
			true,	// workers
			'auto',	// webgl
			onNALunit
		);
		videoCanvas = videoPlayer.canvas;
		container.prepend(videoCanvas);

		startMotionStream(
			motionCanvas,
			videoCanvas,
			wsUrl,
			oPort,
			2000
		);

		new ResizeObserver((elt) => {
			resizeMotionStream(motionCanvas, elt[0].target);
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

	function reconfigureStream()
	{
		sendMessage(
			{
				scope				: "stream",
				verb				: "reconfigure",
				settings : {
                	"width"			: 1280,
                	"height"		: 720,
                	"framerate"		: 24,
					"bitrate"		: 1700000 / 4,
					clusterEpsilon	: 3,
					clusterMinPoints: 2,
					vectorMinMagnitude: 1,
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
			// Stop notifications
		}
	}

</script>

	<svelte:window on:resize={windowResized}/>

	<Fullscreen let:onRequest let:onExit>
		<div bind:this={container} id={containerId}>
			<!-- videoCanvas will be inserted above by Broadway -->
			<canvas on:dblclick={ () => toggleFullScreen(onRequest, onExit) } bind:this={motionCanvas}/>
		</div>
	</Fullscreen>

	{#if videoPlayer}
		<BroadwayStats player={videoPlayer}></BroadwayStats>
	{/if}

	<button on:click={btnRecordStart}>Start recording</button>
	<button on:click={btnRecordStop}>Stop recording</button>

	<button on:click={reconfigureStream}>Reconfigure</button>

	<input type="checkbox" on:change={toggleNotifications}/>Notifications

<style>
	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
	}
</style>