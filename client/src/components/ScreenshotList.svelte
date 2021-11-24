<script>
	// example view-source:https://samirkumardas.github.io/jmuxer/h264_player.html
	import { onMount, onDestroy } from 'svelte';

	import OverlayToggler from "./OverlayToggler.svelte";
	import { fade } from 'svelte/transition';
	import Screenshot from "./Screenshot.svelte";

	import Paper, { Title, Subtitle, Content } from '@smui/paper';

	export let showButton = true;
	export let items = [];
	export let visible = false;
	export let server = "";
	export let dir = "";


	onMount(() => {
	});

</script>

	<OverlayToggler on:message bind:visible={visible} name="" icon="movie" showButton={showButton} position="below">

		<Paper>
			<Title>
				Recorded clips
			</Title>

			<Subtitle>
				By default, the last twenty are listed.
			</Subtitle>

			<Content class="recwrap">
				{#each items as item}
					<div class="box">
						<Screenshot item={item} {server} {dir}></Screenshot>
					</div>
				{/each}
			</Content>
		</Paper>

	</OverlayToggler>


<style>
	.box {
		border-radius: 5px;
		padding: 20px;
	}
</style>