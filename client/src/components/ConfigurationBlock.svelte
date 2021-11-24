<script>
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import IconButton, { Icon } from '@smui/icon-button';
	import { slide } from 'svelte/transition';

	export let configurable;
	export let settings;
	export let parents = [];

	const autoExpanded = ["Settings", "General"];

	let category = false;
	let expanded = false;	// All nodes are collapsed by default
	let parentSettings;
	let orgParents = [...parents];
	let initialized = false;

	function getParentOfNestedValue(obj, path)
	{
		return path.length > 1 ? getParentOfNestedValue(obj[path[0]], path.slice(1)) : obj;
	}

	function init()
	{
		// Is this a 'category' which has a 'name'? It means its corresponding value does not live in the root of settings.
		if(!configurable.ui && configurable.name && configurable.children.length > 0) {
			category = true;
			parents = [...parents, configurable.name];
		} else if(!configurable.ui) {
			// A category without any UI component
			category = true;
			if(autoExpanded.includes(configurable.label)) {
				if(!initialized) expanded = true;
			} else {
				if(!initialized) expanded = false;
			}
		} else {
			// It's got a UI component. This is an actual changable setting.
			parentSettings = getParentOfNestedValue(settings, [ ...parents, configurable.name ]);
			if(!initialized) expanded = true;
		}

		initialized = true;
	}

$:	if(settings && settings.streamOverlay && settings.streamOverlay.enabled !== undefined) {
		parents = [...orgParents];
		init();
	}

</script>

{#if initialized}
	<ul>
		<li>
			<div>
				{#if parentSettings && (configurable.ui === "textbox" || configurable.ui === "password")}
					{#if configurable.type === "int"}
						<Textfield 
							min={configurable.range[0]}
							max={configurable.range[1]} 
							type="number" bind:value={parentSettings[configurable.name]} label="{configurable.label}"
						>
							<HelperText persistent slot="helper">
								{#if configurable.doc}
									<span>
										{configurable.doc}
									</span>
								{/if}

								{#if configurable["default"] !== undefined}
									<span class="defaults">
										Default: {configurable["default"]}
									</span>
								{/if}
							</HelperText>
						</Textfield>

					{:else}
						<Textfield 
							type="{(configurable.ui !== "password") ? "text" : configurable.ui}"
							bind:value={parentSettings[configurable.name]}
							label="{configurable.label}"
						>
							<HelperText persistent slot="helper">
								{#if configurable.doc}
									<span>
										{configurable.doc}
									</span>
								{/if}

								{#if configurable["default"] !== undefined}
									<span class="defaults">
										Default: {configurable["default"]}
									</span>
								{/if}
							</HelperText>
						</Textfield>
					{/if}

				{:else if parentSettings && configurable.ui === "checkbox"}
					<h3>
						<input type="checkbox" bind:checked={parentSettings[configurable.name]}/>
						{configurable.label}
					</h3>

				{:else if !configurable.ui}
					<h3 class="expandable" on:click={() => { expanded = !expanded; } }>
						<Icon class="material-icons">{expanded ? "expand_less" : "expand_more"}</Icon>
						{configurable.label}
					</h3>

				{/if}

				<div class="content" class:expanded={expanded}>
					{#if configurable.doc && category}
						<ul>
							<li>
								<span class="categoryDoc">
									{configurable.doc}
								</span>
							</li>
						</ul>
					{/if}

					{#if configurable.children}
						{#each configurable.children as child}
							<svelte:self configurable={child} bind:settings={settings} parents={parents}></svelte:self>
						{/each}
					{/if}
				</div>
			</div>
		</li>
	</ul>
{/if}

<style>
	h3 {
		margin: 0;
		padding: 0;
	}
	ul {
		list-style-type: none;
	}
	li {
		padding-bottom: 20px;
	}
	.content {
		display: none;
	}

	.expanded {
		display: block;
	}

	.expandable {
		cursor: pointer;
		color: blue;
	}

	.defaults {
		display: block;
	}

	.categoryDoc {
		font-size: smaller;
	}


</style>