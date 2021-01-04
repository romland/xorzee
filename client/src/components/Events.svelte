<script>
	import OverlayToggler from "./OverlayToggler.svelte";

	export let showButton = true;
	export let visible = false;
	export let settings = null;

	let eventCache = [];

	export function newEvent(e)
	{
		console.log("Events component got", e);

		if(eventCache.length >= 100) {
			eventCache.shift();
		}

		eventCache.push(e);
		eventCache = eventCache;
	}
</script>

	<OverlayToggler name="☀ Events" {visible} showButton={showButton} position="above">
		Recent events
		{#each eventCache as e}
			{e.event}<br/>
		{/each}
	</OverlayToggler>
