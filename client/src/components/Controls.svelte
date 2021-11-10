<script>
	import OverlayToggler from "./OverlayToggler.svelte";
	import Button, { Label } from '@smui/button';

	// export let videoPlayer;
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
</script>

	<OverlayToggler on:message bind:visible={visible} name="✓ Controls" showButton={showButton} position="below">
		<div>
<Button color="secondary" variant="unelevated">
	<Label>Unelevated</Label>
</Button>			
			<button on:click={btnToggleVideoStream}>Toggle video stream</button>
			<button on:click={btnRecordStart}>Start recording</button>
			<button on:click={btnRecordStop}>Stop recording</button>
			<button on:click={() => drawingIgnoreArea = !drawingIgnoreArea}>Toggle adding ignore area</button>
			<input type="checkbox" on:change={toggleNotifications}/>Notifications
		</div>
	</OverlayToggler>

