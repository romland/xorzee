<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Button, { Label } from '@smui/button';
	import IconButton, { Icon } from '@smui/icon-button';

	const dispatch = createEventDispatcher();

	export let visible = true;
	export let style = "";
	export let label = "";
	export let pressed = false;
	export let icon = null;


	function clicked(e)
	{
		dispatch("click", {
			label : label,
			style : style
		});
	}
</script>

	<div class:hide={!visible} on:click|preventDefault={clicked}>
		{#if label && icon}
			<Button color={pressed ? "primary" : "secondary"} variant="unelevated">
				<Icon class="material-icons" on>{icon}</Icon>
				<Label>{label}</Label>
			</Button>

		{:else if label}
			<Button color={pressed ? "primary" : "secondary"} variant="unelevated">
				<Label>{label}</Label>
			</Button>

		{:else if icon}
			<IconButton toggle aria-label="{icon}" title="{icon}">
				<Icon class="material-icons" on>{icon}</Icon>
				<Icon class="material-icons">{icon}_border</Icon>
			</IconButton>

		{:else}
			?
		{/if}
	</div>

<style>
	.hide {
		display: none;
	}
</style>