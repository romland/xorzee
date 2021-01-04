<script>
	import { scale } from "svelte/transition";

	export let name, visible, showButton, position = "below";

	let label, content, contentPos;

	function open()
	{
		if(!visible) {
			const rect = label.getBoundingClientRect();

			switch(position) {
				case "below" :
					contentPos = `position: absolute; left: ${rect.left}px; top: ${rect.height}px;`;
					break;

				case "above" :
					contentPos = `position: absolute; left: ${rect.left}px; bottom: ${rect.height}px;`;
					break;

				default :
					console.error("Unsupported position", position);
					break;
			}
		}

		visible = !visible;
	}

</script>

{#if showButton}
	<div bind:this={label} on:click={open}>
		{name}
	</div>

	<div bind:this={content} style={contentPos}>
		{#if visible}
			<div transition:scale="{{start:0.25}}">
				<slot></slot>
			</div>
		{/if}
	</div>
{/if}

<style>
	.box {
		
		background-color: blue;
		
		animation-name: spin;
		animation-duration: 4000ms;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0);
		}
		
		to {
			transform: rotate(360deg);
		}
	}

</style>