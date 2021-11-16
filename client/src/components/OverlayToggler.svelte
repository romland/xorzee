<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { scale, fade, fly } from "svelte/transition";
	import Button from './Button.svelte';

	export let name, visible, showButton, position = "below";

	let label, content, contentPos;

	const dispatch = createEventDispatcher();

	function open()
	{
		if(!visible) {
			const rect = label.getBoundingClientRect();

			switch(position) {
				case "below" :
					contentPos = `position: absolute; left: ${rect.left}px; top: ${rect.height + 10}px;`;
					break;

				case "above" :
					contentPos = `position: absolute; left: ${rect.left}px; bottom: ${rect.height + 10}px;`;
					break;

				default :
					console.error("Unsupported position", position);
					break;
			}
		}

		visible = !visible;

		dispatch('message', {
			type : visible ? "open" : "close",
			label : label
		});
	}



</script>

{#if showButton}
	<div bind:this={label} >
		<Button label={name} style="square" bind:pressed={visible} on:click={open}></Button>
	</div>

	<div bind:this={content} style={contentPos} class="outer" out:fade>
		{#if visible}
			<div class="content" in:fade out:scale>
				<slot></slot>
			</div>
		{/if}
	</div>
{/if}

<style>

	.content {
		width: 60vw;
		height: auto;
		padding: 25px;
		border-radius: 4px;
		overflow-y: auto;
		max-height: 350px;
/*
		opacity: 0.8;
*/
	}

</style>