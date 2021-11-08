<script>
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
				{#if parentSettings && configurable.ui === "textbox"}
					<h3>{configurable.label}</h3>
					{#if configurable.type === "int"}
						<input type="number"
							min={configurable.range[0]}
							max={configurable.range[1]} 
							bind:value={parentSettings[configurable.name]}
						/>
					{:else}
						<input type="text" bind:value={parentSettings[configurable.name]}/>
					{/if}

				{:else if parentSettings && configurable.ui === "checkbox"}
					<h3>
						<input type="checkbox" bind:checked={parentSettings[configurable.name]}/>
						{configurable.label}
					</h3>

				{:else if parentSettings && configurable.ui === "password"}
					<h3>{configurable.label}</h3>
					<input type="password" bind:value={parentSettings[configurable.name]}/>

				{:else if !configurable.ui}
					<h3 class="expandable" on:click={() => { expanded = !expanded; } }>{configurable.label}</h3>

				{/if}

				<div class="content" class:expanded={expanded}>
					{#if configurable.doc}
						{#if category}
							<ul>
								<li>
									<span>
										{configurable.doc}
									</span>
								</li>
							</ul>
						{:else}
							<span>
								{configurable.doc}
							</span>
						{/if}
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

	span {
		font-size: smaller;
	}
</style>