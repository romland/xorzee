<script>
	import { onMount, onDestroy } from 'svelte';

	import Player from "./components/Player.svelte";
	import { videoPlayers } from './state.js';
	import IconButton, { Icon } from '@smui/icon-button';

	import Menu from '@smui/menu';
	import { Anchor } from '@smui/menu-surface';
	import List, {
	  Item,
	  Separator,
	  Text,
	  PrimaryText,
	  SecondaryText,
	} from '@smui/list';
	import Button from '@smui/button';
	import TopAppBar, {
		Row,
		Section,
		Title,
		AutoAdjust
	} from '@smui/top-app-bar';
	
	let topAppBar;
   
	let menu;
	let anchor;
	let anchorClasses = {};

	const DEVELOPING_CLIENT_ON_LOCALHOST = true;

	let showOverlayButtons = true;
	let neighbours = [];
	let remoteServer = false;
	let remoteAddress = null;
	let playerWidthValue = 48;
	let playerWidth = playerWidthValue + "%";

	// TODO: The first server needs to provide its motionStreamPort to 
	//       its clients -- the rest SHOULD be dynamic... The TODO here
	//       is to get rid of this hardcoded port number and somehow
	//       hand it over dynamically together with the client itself...
	let motionStreamPort = 8082;

	if(DEVELOPING_CLIENT_ON_LOCALHOST) {
		// Set the address of the 'first server' if our client is not hosted by that server.
		remoteServer = true;
		// remoteAddress = "192.168.178.193";	// raspi-zero with IR/noIR camera (own IR lamps) (currently my RobotCar prototype)
		// remoteAddress = "192.168.178.194";	// raspi-zero test
		// remoteAddress = "192.168.178.228";	// The 'desktop' raspi 3b+
		// remoteAddress = "192.168.178.67";		// the JoyIt fisheye tester (Vidensi) (on my desk)
		remoteAddress = "192.168.178.101";		// Ethernet: the JoyIt fisheye tester (Vidensi) (on my desk)
		// remoteAddress = "192.168.178.47";		// vidensivision / CM3 / dual camera (Waveshare) (shitty cheap WiFi adapter, so might change!)
	}


	function neighbourChange(e)
	{
		neighbours = e.detail.data;
	}

	function isValidAddress(addr)
	{
		// Well, shit, for now, ignore IPv6
		if(addr.includes(":")) {
			return false;
		}
		return true;
	}

	let time = null;
	onMount(() => {
		document.addEventListener("visibilitychange", function() {
			console.log("document.hidden", document.hidden)
			if(document.hidden) {
				var notification = new Notification(
					'Xorzee',
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

		const interval = setInterval(() => {
			time = new Date();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	function playAll(ev)
	{
		console.log("playAll!", videoPlayers);
		videoPlayers.map(videoStreamer => {
			videoStreamer.player.canvas.play();
			if(videoStreamer.player.canvas.duration > 0) {
				if(videoStreamer.player.canvas.duration === Infinity) {
					videoStreamer.player.canvas.currentTime = videoStreamer.player.canvas.seekable.end(0);
				} else {
					videoStreamer.player.canvas.currentTime = videoStreamer.player.canvas.duration + 5000;
				}
			}

		});
	}

	// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date#Example.3A_ISO_8601_formatted_dates
	function pad(n){return n<10 ? '0'+n : n}
	function ISODateString(d)
	{
		if(!d) return "";

		return d.getFullYear()+'-'
			+ pad(d.getMonth()+1)+'-'
			+ pad(d.getDate())+' '
			+ pad(d.getHours())+':'
			+ pad(d.getMinutes())+':'
			+ pad(d.getSeconds());
	}

$:	if(playerWidthValue) {
		playerWidth = playerWidthValue + "%";
	}
</script>

<TopAppBar bind:this={topAppBar} variant="short" collapsed dense>
	<Row>
		<Section>
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
				<IconButton aria-label="Global options" title="Global options" on:click={() => menu.setOpen(true)}>
					<Icon class="material-icons">menu</Icon>
				</IconButton>
				<Menu
					bind:this={menu}
					anchor={false}
					bind:anchorElement={anchor}
					anchorCorner="BOTTOM_LEFT"
					style="z-index: 150;"
				>
					<List twoLine>
						<Item on:SMUI:action={() => console.log("foo") }>
							<Text>
								<PrimaryText>
									<input type="range" min="10" max="98" bind:value={playerWidthValue}>
								</PrimaryText>
								<SecondaryText>Drag to change player size.</SecondaryText>
							</Text>
						</Item>

						<Item on:SMUI:action={() => showOverlayButtons = !showOverlayButtons }>
							<Text>
								<PrimaryText>
									{#if showOverlayButtons}
										Hide controls
									{:else}
										Show controls
									{/if}
								</PrimaryText>
								<SecondaryText>Visibility of controls.</SecondaryText>
							</Text>
						</Item>
					</List>
				</Menu>
			</div>
			<Title>Xorzee</Title>
		</Section>

		<Section align="end" toolbar>
			<div class="title mdc-top-app-bar__action-item">
				Xorzee
			</div>
		</Section>
	</Row>
</TopAppBar>

<AutoAdjust {topAppBar}>
	<main>
		<div class="players">
			<div class="player">
				<!-- our primary server, the other ones we should NOT get neighbour events from -->
				<Player
					on:playAll={playAll}
					on:neighbourChange={neighbourChange}
					{remoteServer}
					{remoteAddress}
					{motionStreamPort}
					{showOverlayButtons}
					bind:playerWidth={playerWidth}
				></Player>
			</div>

			<!-- Each of our neighbours on the network -->
			{#each neighbours as neighbour}
				{#if isValidAddress(neighbour.address)}
					<div class="player">
						<Player
							on:playAll={playAll}
							remoteServer={true}
							remoteAddress={neighbour.address}
							motionStreamPort={neighbour.port}
							{showOverlayButtons}
							bind:playerWidth={playerWidth}
						></Player>
					</div>
				{/if}
			{/each}
		</div>
	</main>
</AutoAdjust>

<style>
	main {
		min-height: 100%;
	}
	.players {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-content: space-around;
	}

	.player {
		border-radius: 6px;
		border: 4px solid #333;
/*untested:		box-sizing: border-box;
*/
		margin: 0.3%;
	}

	.title {
		margin-top: -2px;
	}

	/* Hide everything above this component. */
	:global(app),
	:global(body),
	:global(html) {
		display: block !important;
		height: auto !important;
		width: auto !important;
		position: static !important;
	}
</style>