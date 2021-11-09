<script>
	import OverlayToggler from "./OverlayToggler.svelte";

	export let showButton = true;
	export let visible = false;
	// export let settings = null;

	let eventCache = [];

	export function newEvent(e)
	{
		// console.log("Events component got", e);

		if(eventCache.length >= 100) {
			eventCache.shift();
		}

		eventCache.push(e);
		eventCache = eventCache;
	}
</script>

	<OverlayToggler on:message bind:visible={visible} name="☀ Events" showButton={showButton} position="above">
		<div>
			Recent events
			{#each eventCache as e}
				{e.event}<br/>
			{/each}
		</div>
	</OverlayToggler>
