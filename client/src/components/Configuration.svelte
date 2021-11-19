<script>
	import OverlayToggler from "./OverlayToggler.svelte";
	import ConfigurationBlock from "./ConfigurationBlock.svelte";

	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
	export let settingsMeta = null;
	export let visible = false;

	function save()
	{
		if(!sendMessage) {
			console.warn("No sendMessage() cannot save settings");
			return;
		}

		sendMessage(
			{
				scope : "general",
				verb : "reconfigure",
				data : settings
			}
		);
	}
</script>

	<OverlayToggler on:message bind:visible={visible} name="" icon="settings" showButton={showButton} position="below">
		<div style="background-color: black;">
			<button on:click={save}>Save</button>
			<ConfigurationBlock	bind:settings={settings} bind:configurable={settingsMeta}></ConfigurationBlock>
		</div>
	</OverlayToggler>
