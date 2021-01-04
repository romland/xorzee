<script context="module">
	// Variables in a module are not reactive, hence the fiddle.
	let _totalNALs = 0;
	let _secondBytes = 0;

	export function onNALunit(len)
	{
		_secondBytes += len;
		_totalNALs++;
	}
</script>

<script>
	export let showButton = true;
	export let player;
	export let visible;

	let playerWidth = 0, playerHeight = 0;

	let totalNALs = 0;
	let lastSecondBytes = 0, secondBytes = 0, totalBytes = 0;
	let secondFrames = 0, lastSecondFrames = 0, totalFrames = 0;
	let started = Date.now(), elapsed = Date.now();

	player.onPictureDecoded = (buffer, width, height) => {
		if(playerWidth !== width || playerHeight !== height) {
			playerWidth = width;
			playerHeight = height;
		}
		secondFrames++;
	}

	setInterval(() => {
		totalNALs = _totalNALs;

		totalBytes += _secondBytes;
		lastSecondBytes = _secondBytes;

		totalFrames += secondFrames;
		lastSecondFrames = secondFrames;

		secondFrames = 0;
		_secondBytes = 0;

		var date = new Date(null);
		date.setSeconds((Date.now() - started)/1000);
		elapsed = date.toISOString().substr(11, 8);
	}, 1000);


	function open()
	{
		visible = !visible;
	}

</script>

{#if showButton}
	<div on:click={open}>
		🗠 Statistics
	</div>
{/if}

{#if visible}
	<div>
		<span>{playerWidth}x{playerHeight}</span>,
		<span>{lastSecondFrames} fps</span>,
		<span>{(lastSecondBytes/1024).toFixed(2)} KiB/s</span>,
		<span>{(lastSecondBytes/1024/125).toFixed(2)} Mbit/s</span>,
		<span>total {(totalBytes/1048576).toFixed(2)} MiB</span>,
		<span>{totalNALs} NAL units</span>,
		<span>{totalFrames} frames in {elapsed}</span>
	</div>
{/if}
