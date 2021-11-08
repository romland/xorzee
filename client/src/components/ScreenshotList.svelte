<script>
	// example view-source:https://samirkumardas.github.io/jmuxer/h264_player.html
	import { onMount, onDestroy } from 'svelte';

	import OverlayToggler from "./OverlayToggler.svelte";
	import { fade } from 'svelte/transition';
	import { utcToDateTime } from '../lib/utils.js';
	import Loading from "./Loading.svelte";

	import JMuxer from 'jmuxer/dist/jmuxer';	// don't go with default .min.js

	export let showButton = true;
	export let server = "";
	export let dir = "";
	export let items = [];
	export let visible = false;

	const baseUrl = server + dir;

	onMount(() => {
	});

	var jmuxer;

	function play(item)
	{
		console.log("TODO play", item);
        if (jmuxer) {
            jmuxer.destroy();
        }

        jmuxer = new JMuxer({
            node: item.video,
            mode: 'video',
            flushingTime: 1,
            fps: item.framerate,
            clearBuffer: false,
            // debug: true
        });

		var oReq = new XMLHttpRequest();
		oReq.open("GET", `${baseUrl}${item.video}`, true);
		oReq.responseType = "arraybuffer";
		console.log("Fetch:", `${baseUrl}${item.video}`);

		oReq.onload = function (oEvent) {
			var arrayBuffer = oReq.response; // Note: not oReq.responseText
			if (arrayBuffer) {
				jmuxer.feed({
					video: new Uint8Array(arrayBuffer),
					// duration: (item.stopped - item.started)
				});
			}
		};

		oReq.send(null);
	}

</script>

	<OverlayToggler on:message bind:visible={visible} name="📹 Recordings" showButton={showButton} position="above">
		<div>
			<div class="overlay" in:fade out:fade>
				<div class="cards">
					<Loading></Loading>

					{#each items as item}
						<div class="card">
							<div class="content">
								<!-- svelte-ignore a11y-media-has-caption -->
								<video width="90%" controls autoplay id={item.video}></video>
								<img alt="" src="{baseUrl}{item.screenshot}"/>
								<p>
									<span on:click={() => {play(item)}}>play test</span>
								</p>
							</div>
							
							<footer>
								{utcToDateTime(item.started)}
							</footer>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</OverlayToggler>





<style>

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill,minmax(200px,1fr));
		grid-gap: 10px;
	}
	.card {
		display: flex;
		flex-direction: column;
	}

	.card .content {
		flex: 1 1 auto;
	}

	img {
		width: 90%;
		height: auto;
	}
</style>