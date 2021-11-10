<script>
	// example view-source:https://samirkumardas.github.io/jmuxer/h264_player.html
	import { onMount, onDestroy } from 'svelte';

	import OverlayToggler from "./OverlayToggler.svelte";
	import { fade } from 'svelte/transition';
	import { utcToDateTime } from '../lib/utils.js';
	import Loading from "./Loading.svelte";

	import JMuxer from 'jmuxer/src/jmuxer.js';	// don't go with default .min.js

	import Card, {
		Content,
		PrimaryAction,
		Actions,
		ActionButtons,
		ActionIcons,
	} from '@smui/card';
	import Button, { Label } from '@smui/button';
	import IconButton, { Icon } from '@smui/icon-button';
	import LayoutGrid, { Cell } from '@smui/layout-grid';

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

	function secToTime(seconds)
	{
		var date = new Date(null);
		date.setSeconds(seconds);
		return date.toISOString().substr(11, 8);		
	}

	/*
	 * Brutally copy/pasted from
	 * https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
	 */
	function formatBytes(bytes, decimals = 2)
	{
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

/*
an item:
	camera: "My Awesome Sensor"
	screenshot: "1608770998037.jpg"
	size: 5063593
	started: 1608770998243
	stopped: 1608771299603
	video: "1608770998037.h264"
*/
</script>

	<OverlayToggler on:message bind:visible={visible} name="📹 Recordings" showButton={showButton} position="above">
		<div>
			<div class="overlay" in:fade out:fade>
				<div class="cards">
					<Loading></Loading>

					<LayoutGrid>
						{#each items as item}
							<Cell>
								<div class="demo-cell">
									<Card>
										<Content>
											<video controls autoplay id={item.video}></video>
											<img style="width: 33%;" alt="" src="{baseUrl}{item.screenshot}" />
												
										</Content>
										<Actions>
											<IconButton
												toggle
												aria-label="Add to favorites"
												title="Add to favorites"
											>
												<Icon class="material-icons" on>favorite</Icon>
												<Icon class="material-icons">favorite_border</Icon>
											</IconButton>
											<IconButton
												class="material-icons"
												title="Share">share</IconButton
											>
											<IconButton
												class="material-icons"
												title="More options">more_vert</IconButton
											>
											<!--
											{utcToDateTime(item.started)}
											Length: {secToTime(Math.round((item.stopped-item.started)/1000))}
											Size: {formatBytes(item.size, 0)}
											<a download href="{baseUrl}{item.video}">Download</a>
											-->
			
										</Actions>
									</Card>
								</div>
							</Cell>
						{/each}
					</LayoutGrid>
				</div>
			</div>
		</div>
	</OverlayToggler>





<style>
/*
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
*/
	.overlay {
	}
  .demo-cell {
    height: 360px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--mdc-theme-secondary, #333);
    color: var(--mdc-theme-on-secondary, #fff);
  }	
</style>