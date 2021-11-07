<script>
	export let configurable;
	export let settings;
	export let expanded = false;	// All nodes are collapsed by default
	export let parents = [];

	const autoExpanded = ["Settings", "General"];

	let parentSettings;

	function getParentOfNestedValue(obj, path)
	{
		return path.length > 1 ? getParentOfNestedValue(obj[path[0]], path.slice(1)) : obj;
	}

	// Is this a 'category' which has a 'name'? It means its corresponding value does not live in the root of settings.
	if(!configurable.ui && configurable.name && configurable.children.length > 0) {
		parents = [...parents, configurable.name];
	} else if(!configurable.ui) {
		// A category without any UI component
		if(autoExpanded.includes(configurable.label)) {
			expanded = true;
		} else {
			expanded = false;
		}
	} else {
		// It's got a UI component. This is an actual changable setting.
		parentSettings = getParentOfNestedValue(settings, [ ...parents, configurable.name ]);
		expanded = true;
	}

</script>

<ul>
	<li>
		<div>
			{#if configurable.ui === "textbox"}
				<h3>{configurable.label}</h3>
				<input type="text" bind:value={parentSettings[configurable.name]}/>

			{:else if configurable.ui === "checkbox"}
				<h3>
					<input type="checkbox"/>
					{configurable.label}
				</h3>

			{:else if configurable.ui === "password"}
				<h3>{configurable.label}</h3>
				<input type="password"/>

			{:else if !configurable.ui}
				<h3 class="expandable" on:click={() => { expanded = !expanded; } }>{configurable.label}</h3>

			{/if}

			<div class="content" class:expanded={expanded}>
				{#if configurable.doc}
					<div>
						<span>
							{configurable.doc}
						</span>
					</div>
				{/if}

				{#if configurable.children}
					{#each configurable.children as child}
						<svelte:self configurable={child} {settings} {parents}></svelte:self>
					{/each}
				{/if}
			</div>
		</div>
	</li>
</ul>

<style>
	.content {
		display: none;
		background-color: black;
	}

	.expanded {
		display: block;
	}

	.expandable {
		cursor: pointer;
		color: blue;
	}

	span {
		font-size: smaller;
	}
</style>