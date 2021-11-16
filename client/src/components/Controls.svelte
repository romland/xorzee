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

	<OverlayToggler on:message bind:visible={visible} name="" icon="more_vert" showButton={showButton} position="below">
		<div>
			<Button on:click={btnToggleVideoStream} color="secondary" variant="unelevated">
				<Label>Toggle video stream</Label>
			</Button>

			<Button on:click={btnRecordStart} color="secondary" variant="unelevated">
				<Label>Start recording</Label>
			</Button>

			<Button on:click={btnRecordStop} color="secondary" variant="unelevated">
				<Label>Stop recording</Label>
			</Button>

			<Button on:click={() => drawingIgnoreArea = !drawingIgnoreArea} color="secondary" variant="unelevated">
				<Label>Toggle adding ignore area</Label>
			</Button>

			<input type="checkbox" on:change={toggleNotifications}/>Notifications
		</div>
	</OverlayToggler>

