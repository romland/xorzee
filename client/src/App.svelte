<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import Player from "./components/Player.svelte";

	const DEVELOPING_CLIENT_ON_LOCALHOST = true;

	let showOverlayButtons = true;
	let neighbours = [];
	let remoteServer = false;
	let remoteAddress = null;

	// TODO: The first server needs to provide its motionStreamPort to 
	//       its clients -- the rest SHOULD be dynamic... The TODO here
	//       is to get rid of this hardcoded port number and somehow
	//       hand it over dynamically together with the client itself...
	let motionStreamPort = 8082;

	if(DEVELOPING_CLIENT_ON_LOCALHOST) {
		// Set the address of the 'first server' if our client is not hosted by that server.
		remoteServer = true;
		// remoteAddress = "192.168.178.194";
		remoteAddress = "192.168.178.67";
	}


	function neighbourChange(e)
	{
		console.log("APP got new neighbours", e);
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

	onMount(() => {
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
</script>

<main>
	MintyMint

	<div on:click={()=> {showOverlayButtons = !showOverlayButtons}}>
		Toggle controls
	</div>

	<div class="player">
		<!-- our primary server, the other ones we should NOT get neighbour events from -->
		<Player
			on:neighbourChange={neighbourChange}
			{remoteServer}
			{remoteAddress}
			{motionStreamPort}
			{showOverlayButtons}
		></Player>
	</div>

	<!-- TODO: Check so we only do _one_ of each, ipv4 or ipv6 or whatever other hostname we might get -->
	{#each neighbours as neighbour}
		{#if isValidAddress(neighbour.address)}
			<div class="player">
				<Player
					remoteServer={true}
					remoteAddress={neighbour.address}
					motionStreamPort={neighbour.port}
					{showOverlayButtons}
				></Player>
			</div>
		{/if}
	{/each}
</main>

<style>
	.player {
	}
</style>