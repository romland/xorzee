<script>
	import { fade } from 'svelte/transition';
	import Loading from "./Loading.svelte";

	export let showButton = true;
	export let server = "";
	export let dir = "";
	export let items = [];
	export let visible = false;

	const baseUrl = server + dir;

	function open()
	{
		visible = !visible;
	}

</script>

{#if visible}
	<div class="overlay" in:fade out:fade>
		<div class="cards">
			<Loading></Loading>

			{#each items as item}
				<div class="card">
					<div class="content">
						<img alt="" src="{baseUrl}{item.screenshot}"/>
						<p>text</p>
					</div>
					<footer>Card footer</footer>
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if showButton}
	<div class="overlay" on:click={open}>
		📹 Recordings
	</div>
{/if}

<style>

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill,minmax(200px,1fr));
		grid-gap: 10px;
	}
	.card {
		display: flex;
		flex-direction: column;
	}

	.card .content {
		flex: 1 1 auto;
	}

	img {
		width: 90%;
		height: auto;
	}
</style>