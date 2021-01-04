<script>
	import { fade } from 'svelte/transition';

	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
	export let visible = false;

	// console.log(sendMessage, settings);

/*
	// Intention is to put documentation of all settings in here
	// (wait for that to stabilize first)
	let doc = {};
	for(let s in settings) {
		doc[s] = 	{
			"name" : s,
			"default" : settings[s],
			"current" : null,
			"description" : "",
		};
	}
	console.log(doc);
*/

	function open()
	{
		visible = !visible;
	}
</script>

{#if showButton}
	<div on:click={open}>
		⚙ Settings
	</div>
{/if}

{#if visible}
	<div>
		Ability to change all settings
	</div>
{/if}

<style>
</style>