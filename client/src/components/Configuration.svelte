<script>
	import OverlayToggler from "./OverlayToggler.svelte";

	export let showButton = true;
	export let sendMessage = null;
	export let settings = null;
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
</script>

	<OverlayToggler name="⚙ Settings" {visible} showButton={showButton} position="below">
		Ability to change all settings
	</OverlayToggler>
