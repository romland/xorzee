<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { startStream, getOverlayWs } from "../lib/client";

	// Set to true if client is hosted by localhost but streaming server is not.
	const remoteServer = true;

	const vPort = 8081;
	const oPort = 8082;

	// The size of this does not really matter other than preventing a 'flash-before-render'.
	const initialCanvasWidth = 1280;
	const initialCanvasHeight = 720;

	let wsUrl;
	if(remoteServer && window.location.hostname === "localhost") {
		wsUrl = 'ws://192.168.178.67:';
	} else {
		wsUrl = window.location.protocol.replace(/http/, 'ws') + '//' + window.location.hostname + ':';
	}





	onMount(() => {
		startStream(
			'container',
			wsUrl,
			vPort,
			oPort,
			true,	// workers
			'auto',	// webgl
			2000,	// reconnect
			initialCanvasWidth,
			initialCanvasHeight
		);
	});


	function resizeStream()
	{
		getOverlayWs().send(
			JSON.stringify(
			{
				scope : "stream",
				verb : "resize",
				settings : {
                	"width" : 1280,
                	"height" : 720,
                	"framerate" : 40,
					"bitrate" : 1700000 / 4
				}
			})
		);
	}

</script>

	<div id='container'></div>

	<button onclick=javascript:btnRecordStart()>Start recording</button>
	<button onclick=javascript:btnRecordStop()>Stop recording</button>

	<button on:click={resizeStream}>Resize</button>

<style>
	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
	}
</style>