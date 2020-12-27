<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Fullscreen from "./Fullscreen.svelte";

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
	const initialCanvasWidth = 1280;
	const initialCanvasHeight = 720;

	const containerId = "video"+Date.now();
	let container;

	let videoCanvas, motionCanvas;

	let wsUrl;
	if(remoteServer && window.location.hostname === "localhost") {
		wsUrl = 'ws://192.168.178.67:';
	} else {
		wsUrl = window.location.protocol.replace(/http/, 'ws') + '//' + window.location.hostname + ':';
	}

	onMount(() => {
		videoCanvas = startVideoStream(
			container,
			wsUrl,
			vPort,
			2000,	// reconnect
			initialCanvasWidth,
			initialCanvasHeight.
			true,	// workers
			'auto',	// webgl
		);

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


	function resizeStream()
	{
		sendMessage(
			{
				scope			: "stream",
				verb			: "resize",
				settings : {
                	"width"		: 1280,
                	"height"	: 720,
                	"framerate"	: 24,
					"bitrate"	: 1700000 / 4
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

	let fullScreenState;
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
		console.log(this.checked);
		Notification.requestPermission().then(function(result) {
			console.log(result);
		});
	}

</script>

	<svelte:window on:resize={windowResized}/>

	<Fullscreen let:onRequest let:onExit>
		<div bind:this={container} id={containerId}>
			<!-- videoCanvas will be inserted above by Broadway -->
			<canvas on:dblclick={ () => toggleFullScreen(onRequest, onExit) } bind:this={motionCanvas}/>
		</div>
	</Fullscreen>

	<button on:click={btnRecordStart}>Start recording</button>
	<button on:click={btnRecordStop}>Stop recording</button>

	<button on:click={resizeStream}>Resize</button>

	<input type="checkbox" on:change={toggleNotifications}/>Notifications

<style>
	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
	}
</style>