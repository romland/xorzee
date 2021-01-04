<script>
	import { scale } from "svelte/transition";

	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
	export let visible = false;
	export let drawingIgnoreArea = false;

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

	function btnToggleVideoStream()
	{
		sendMessage(
			{
				scope	: "general",
				verb	: "reconfigure",
				data : {
					"streamVideo": !settings.streamVideo,
				}
			}
		);
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

	let label, content, contentPos;
	function open()
	{
		if(!visible) {
			const rect = label.getBoundingClientRect();
			contentPos = `position: absolute; left: ${rect.left}px; top: ${rect.height}px;`;
		}

		visible = !visible;
	}

</script>

{#if showButton}
	<div bind:this={label} on:click={open}>
		✓ Controls
	</div>

	<div bind:this={content} style={contentPos}>
		{#if visible}
			<div transition:scale="{{start:0.25}}">
				<button on:click={btnToggleVideoStream}>Toggle video stream</button>
				<button on:click={btnRecordStart}>Start recording</button>
				<button on:click={btnRecordStop}>Stop recording</button>
				<button on:click={reconfigureStream}>Reconfigure</button>
				<button on:click={() => drawingIgnoreArea = !drawingIgnoreArea}>Toggle adding ignore area</button>
				<input type="checkbox" on:change={toggleNotifications}/>Notifications
			</div>
		{/if}
	</div>
{/if}

<style>
	.box {
		
		background-color: blue;
		
		animation-name: spin;
		animation-duration: 4000ms;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0);
		}
		
		to {
			transform: rotate(360deg);
		}
	}

</style>