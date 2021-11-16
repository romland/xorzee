<script>
	// example view-source:https://samirkumardas.github.io/jmuxer/h264_player.html
	import { onMount, onDestroy } from 'svelte';

	import OverlayToggler from "./OverlayToggler.svelte";
	import { fade } from 'svelte/transition';
	import Screenshot from "./Screenshot.svelte";

	export let showButton = true;
	export let items = [];
	export let visible = false;
	export let server = "";
	export let dir = "";


	onMount(() => {
	});

</script>

	<OverlayToggler on:message bind:visible={visible} name="📹 Recordings" showButton={showButton} position="above">
		<div>
			<div class="overlay wrapper" in:fade out:fade>
				{#each items as item}
					<div class="box">
						<Screenshot item={item} {server} {dir}></Screenshot>
					</div>
				{/each}
			</div>
		</div>
	</OverlayToggler>


<style>
	.wrapper {
		display: grid;
		grid-template-columns: 33% 33% 33%;
		grid-gap: 10px;
	}

	.box {
		/*background-color: #444;*/
		border-radius: 5px;
		padding: 20px;
	}
</style>