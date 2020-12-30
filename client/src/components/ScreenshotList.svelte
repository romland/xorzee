<script>
	export let server = "";
	export let dir = "";
	export let items = [];

	const baseUrl = server + dir;
</script>


<div class="cards">
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