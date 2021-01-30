<script>
/*
https://codepen.io/collection/CFhLc?cursor=ZD0xJm89MSZwPTEmdj03
	https://codepen.io/aaronchuo/pen/adErn
	some styling by: @marcel-robitaille
*/


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

	<div class="scifiUI" class:hide={!visible}>
		<button class:active={pressed} type="button" on:click|preventDefault={clicked}>{label}</button>
	</div>


<style>
	.hide {
		display: none;
	}

	.scifiUI button {
		color: rgb(77, 219, 242);
		overflow: hidden;
		position: relative;
		min-width: 50px;
		min-height: 30px;
		border: 1px solid #00bebe;
		background: rgba(0, 190, 190, 0.2);
	}

	.scifiUI button:hover, .active {
		box-shadow: 0 0 8px #00bebe inset, 0 0 8px #00bebe;
		border: 1px solid #00dcdc;
		color: #00dcdc;
		background: rgba(0, 220, 220, 0.3);
	}
  
</style>