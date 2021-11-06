<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';

	const dispatch = createEventDispatcher();

	export let visible = true;
	export let style = "";
	export let label = "Button";
	export let pressed = false;

	let outerCls, innerCls;


	function clicked(e)
	{
		dispatch("click", {
			label : label,
			style : style
		});
	}
</script>

	<div class:hide={!visible}>
		<button class:active={pressed} type="button" on:click|preventDefault={clicked}>{label}</button>
	</div>


<style>
	.hide {
		display: none;
	}

</style>