<script lang="ts">
	import Player from "./components/Player.svelte";

	const DEVELOPING_CLIENT_ON_LOCALHOST = true;

	let neighbours = [];

	let remoteServer = false;
	let remoteAddress = null;
	let wwwPort = null;

	// TODO: The first server needs to provide its motionStreamPort to 
	//       its clients -- the rest SHOULD be dynamic
	let motionStreamPort = 8082;

	if(DEVELOPING_CLIENT_ON_LOCALHOST) {
		//
		// Set the address of the 'first server' if our client is not hosted by that server.
		//
		remoteServer = true;
		//remoteAddress = "192.168.178.194";
		remoteAddress = "192.168.178.67";
		wwwPort = 8080;
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

</script>

<main>
	MintyMint

	<!-- our primary server, the other ones we should NOT get neighbour events from -->
	<Player
		on:neighbourChange={neighbourChange}
		{remoteServer}
		{remoteAddress}
		{wwwPort}
		{motionStreamPort}
	></Player>

	{#each neighbours as neighbour}
		<!-- TODO: Check so we only do _one_ of each, ipv4 or ipv6 or whatever other hostname we might get -->
		{#if isValidAddress(neighbour.address)}
			<Player
				remoteServer={true}
				remoteAddress={neighbour.address}
				wwwPort={null}
				motionStreamPort={neighbour.port}
			></Player>
		{/if}
	{/each}
</main>
