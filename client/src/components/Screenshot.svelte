<script>
	import Card, {
		Content,
		PrimaryAction,
		Actions,
		ActionButtons,
		ActionIcons,
	} from '@smui/card';
	import Button, { Label } from '@smui/button';
	import IconButton, { Icon } from '@smui/icon-button';
	import { can, utcToDateTime } from '../lib/utils.js';
	import { user } from '../state.js';
	import Loading from "./Loading.svelte";

	export let item;

	import JMuxer from 'jmuxer/src/jmuxer.js';	// don't go with default .min.js
	export let server = "";
	export let dir = "";

	let playing = false;
	const baseUrl = server + dir;


	let imageError = false;

	var jmuxer;

	function play(item)
	{
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
$:	if(playing === true) {
		play(item);
	}

</script>

{#if item}
	<Card>
		<Content style="padding: 0;">
			<span class="notes block">
				{utcToDateTime(item.started)}
			</span>

			<video style="width: 100%;" class:hidden={playing === false} controls autoplay id={item.video}></video>
			<img 
				class:hidden={playing === true} 
				on:click={()=>{ playing = true; }}
				on:error={()=>{ imageError = true; }}
				style="width: 100%; cursor: pointer; padding: 0; margin: 0;"
				alt=""
				src="{baseUrl}{item.screenshot}"
			/>
			{#if imageError}
				<Loading></Loading>
			{/if}
			<span class="notes block">
				{secToTime(Math.round((item.stopped-item.started)/1000))}
				({formatBytes(item.size, 0)})
			</span>
		</Content>

		<Actions>
			<IconButton toggle aria-label="Add to favorites" title="Add to favorites">
				<Icon class="material-icons" on>favorite</Icon>
				<Icon class="material-icons">favorite_border</Icon>
			</IconButton>

			{#if can($user, "read", "clip")}
				<a download href="{baseUrl}{item.video}">
					<IconButton class="material-icons" title="Download">
						download
					</IconButton>
				</a>
			{/if}

			{#if can($user, "delete", "clip")}
				<IconButton class="material-icons" title="Delete">
					delete
				</IconButton>
			{/if}

			<IconButton class="material-icons" title="More options">
				more_vert
			</IconButton>
		</Actions>
	</Card>

{/if}

<style>
	.hidden {
		display: none;
	}
	.notes {
		font-size: smaller;
	}
	.block {
		display: block;
		width: 100%;
		background-color: black;
		text-align: center;
	}
</style>