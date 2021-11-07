<script>
	import OverlayToggler from "./OverlayToggler.svelte";
	import ConfigurationBlock from "./ConfigurationBlock.svelte";

	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
	export let settingsMeta = null;
	export let visible = false;

	// console.log(sendMessage, settings);

/*
	// Intention is to put documentation of all settings in here
	// (wait for that to stabilize first)
	let doc = {};
	for(let s in settings) {
		doc[s] = 	{
			"name" : s,
			"default" : settings[s],
			"current" : null,
			"description" : "",
		};
	}
	console.log(doc);
*/

/*
TODO On server:
- need to store default settings before we populate it with overridden ones (xorzee.conf)
- use the defaults to set 'current' and 'default' on every setting in 'settingsMeta'
*/
/*
how to change settings:

	function reconfigureStream()
	{
		sendMessage(
			{
				scope	: "general",
				verb	: "reconfigure",
				data : {
                	"width"				: 1280,
                	"height"			: 720,
                	"framerate"			: 24,
					"bitrate"			: 1700000 / 4,
					"clusterEpsilon"	: 3,
					"clusterMinPoints"	: 2,
					"vectorMinMagnitude": 1,
				}
			}
		);
	}
*/
</script>

	<OverlayToggler on:message bind:visible={visible} name="⚙ Settings" showButton={showButton} position="below">
		<div style="background-color: black;">
			<ConfigurationBlock	bind:settings={settings} configurable={settingsMeta}></ConfigurationBlock>
		</div>
	</OverlayToggler>
