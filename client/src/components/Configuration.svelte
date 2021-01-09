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

	<OverlayToggler on:message bind:visible={visible} name="⚙ Settings" showButton={showButton} position="below">
		<div>
			<button>Foo 1</button>
			<span style="color:#fff">
				Ability
			</span>
			to change all settings.
			<button>Foo 2</button>
			<span style="background-color: #383;">
				Text in a span
			</span>
			Some text after.
			<div>
				<button>Foo 3</button>
			</div>
			Some text after 2.
			Some text after 3.
			Some text after 4.
			Some text after 5.
			Some text after 6.
			Some text after 7.
			Some text after 8.
			Some text after 9.
			<div>
				Some text after 10.
				Some text after 11.
				Some text after 12.
			</div>

			<ul>
				<li>
					Some text after 13.
				</li>

				<li>
					Some text after 14.
				</li>

				<li>
					Some text after 15.
				</li>

				<li>
					Some text after 16.
				</li>

				<li>
					Some text after 17.
				</li>
			</ul>
		</div>
	</OverlayToggler>
