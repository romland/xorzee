<script>
	import OverlayToggler from "./OverlayToggler.svelte";
	import Button, { Label } from '@smui/button';
	import Menu from '@smui/menu';
	import { Anchor } from '@smui/menu-surface';
	import List, {
	  Item,
	  Separator,
	  Text,
	  PrimaryText,
	  SecondaryText,
	  Graphic,
	} from '@smui/list';
	import IconButton, { Icon } from '@smui/icon-button';
	import Switch from '@smui/switch';
	import FormField from '@smui/form-field';

	// export let videoPlayer;
	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
	export let visible = false;
	export let drawingIgnoreArea = false;
	export let crispVideo = false;
	export let toggleLayer;

	let menu;
	let anchor;
	let anchorClasses = {};

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

	function toggleNotifications(ev)
	{
		if(ev.target.checked) {
			Notification.requestPermission().then(function(result) {
				console.log(result);
			});
		} else {
			// Stop notifications (make a state for this)
		}
	}
</script>

	<div
		class={Object.keys(anchorClasses).join(' ')}
		use:Anchor={{
			addClass: (className) => {
				if (!anchorClasses[className]) {
					anchorClasses[className] = true;
				}
			},
			removeClass: (className) => {
				if (anchorClasses[className]) {
					delete anchorClasses[className];
					anchorClasses = anchorClasses;
				}
			},
		}}
		bind:this={anchor}
	>
	{#if showButton}
		<IconButton aria-label="Camera controls" title="Camera controls" on:click={() => menu.setOpen(true)}>
			<Icon class="material-icons">more_vert</Icon>
		</IconButton>
	{/if}
		<Menu
			bind:this={menu}
			anchor={false}
			bind:anchorElement={anchor}
			anchorCorner="BOTTOM_LEFT"
			style="z-index: 150;"
		>
			<List twoLine>
				<Item on:SMUI:action={btnToggleVideoStream}>
					<Graphic class="material-icons">pause</Graphic>
					<Text>
						<PrimaryText>
							{settings.streamVideo ? "Pause" : "Resume"} video stream
						</PrimaryText>
						<SecondaryText>Toggle whether to stream video.</SecondaryText>
					</Text>
				</Item>

				<Item on:SMUI:action={btnRecordStart}>
					<Graphic class="material-icons">fiber_manual_record</Graphic>
					<Text>
						<PrimaryText>
							Record
						</PrimaryText>
						<SecondaryText>Start recording.</SecondaryText>
					</Text>
				</Item>

				<Item on:SMUI:action={btnRecordStop}>
					<Graphic class="material-icons">stop</Graphic>
					<Text>
						<PrimaryText>
							Stop
						</PrimaryText>
						<SecondaryText>Stop recording.</SecondaryText>
					</Text>
				</Item>

				<Item on:SMUI:action={() => drawingIgnoreArea = !drawingIgnoreArea }>
					<Graphic class="material-icons">edit</Graphic>
					<Text>
						<PrimaryText>
							Ignore area
						</PrimaryText>
						<SecondaryText>Toggle overlay to configure ignored area.</SecondaryText>
					</Text>
				</Item>

				<Item on:SMUI:action={() => toggleLayer("StreamStats") }>
					<Graphic class="material-icons">bar_chart</Graphic>
					<Text>
						<PrimaryText>
							Statistics
						</PrimaryText>
						<SecondaryText>Toggle video stream statistics.</SecondaryText>
					</Text>
				</Item>

				<Separator/>

				<Item>
					<Graphic class="material-icons">notifications</Graphic>
					<Text>
						<PrimaryText>
							<FormField>
								<Switch on:change={(e)=>toggleNotifications(e)}/>
								<span slot="label">Notifications</span>
							</FormField>
						</PrimaryText>
						<SecondaryText>Show Xorzee notifications outside browser.</SecondaryText>
					</Text>
				</Item>

				<Item on:SMUI:action={() => console.log("foo") }>
					<Graphic class="material-icons">lens_blur</Graphic>
					<Text>
						<PrimaryText>
							<FormField>
								<Switch bind:checked={crispVideo}/>
								<span slot="label">Crisp video</span>
							</FormField>
						</PrimaryText>
						<SecondaryText>Toggle whether to not anti-alias video.</SecondaryText>
					</Text>
				</Item>

			</List>
		</Menu>
	</div>

<!--
	<OverlayToggler on:message bind:visible={visible} name="" icon="more_vert" showButton={showButton} position="below">
		<div>
			<Button on:click={btnToggleVideoStream} color="secondary" variant="unelevated">
				<Label>{settings.streamVideo ? "Pause" : "Resume"} video stream</Label>
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
			<input type="checkbox" bind:checked={crispVideo}/>Crisp video
		</div>
	</OverlayToggler>

-->
