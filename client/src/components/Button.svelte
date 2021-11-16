<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Button, { Label } from '@smui/button';

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

	<div class:hide={!visible} on:click|preventDefault={clicked}>
		<!--
		<button class:active={pressed} type="button" on:click|preventDefault={clicked}>{label}</button>
		-->

		<Button color={pressed ? "primary" : "secondary"} variant="unelevated">
			<Label>{label}</Label>
		</Button>

	</div>


<style>
	.hide {
		display: none;
	}

</style>