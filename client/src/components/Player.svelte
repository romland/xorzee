<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { startStream } from "../lib/client";

	const remoteServer = true;

	const vPort = 8081;
	const oPort = 8082;

	const initialCanvasWidth = 1920;
	const initialCanvasHeight = 1080;

	let wsUrl;
	if(remoteServer) {
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


</script>

	<div id='container'></div>

	<button onclick=javascript:btnRecordStart()>Start recording</button>
	<button onclick=javascript:btnRecordStop()>Stop recording</button>


<style>
	:global(canvas) {
		border: 1px solid #eee;
		margin-bottom: 20px;
	}
</style>