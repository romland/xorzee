<script>
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

	function open()
	{
		visible = !visible;
	}
</script>

{#if visible}
	<div>
		Recent events
		{#each eventCache as e}
			{e.event}<br/>
		{/each}
	</div>
{/if}

{#if showButton}
	<div on:click={open}>
		☀ Events
	</div>
{/if}