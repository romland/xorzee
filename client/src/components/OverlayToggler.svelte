<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { scale, fade, fly } from "svelte/transition";
	import { elasticOut, quadOut } from 'svelte/easing';
	import Button from './Button.svelte';

	export let name, visible, showButton, position = "below";

	let label, content, contentPos;

	const dispatch = createEventDispatcher();

	function open()
	{
		if(!visible) {
			const rect = label.getBoundingClientRect();

			switch(position) {
				case "below" :
					contentPos = `position: absolute; left: ${rect.left}px; top: ${rect.height + 10}px;`;
					break;

				case "above" :
					contentPos = `position: absolute; left: ${rect.left}px; bottom: ${rect.height + 10}px;`;
					break;

				default :
					console.error("Unsupported position", position);
					break;
			}
		}

		visible = !visible;

		dispatch('message', {
			type : visible ? "open" : "close",
			label : label
		});
	}


	/**
	 * Speed is per character,
	 * 
	 * Note: Due to bug in Svelte: the container passed into typewriter must have 
	 *       one node -- and _that_ node is animated (not the actual node passed in).
	 */
	function typewriter(node, { speed = 50 })
	{
		const nodeMeta = [];
		var contentLength = 0;

		/*
			Sigh. Well. This was discouraging.
			Clearing a <slot> with innerHTML makes Svelte barf when transitioning _out_.

			Error: Uncaught TypeError: node.parentNode is null
			Trace: transition_out() -> destroy() -> destroy() -> detach_dev() -> detach()

			The work-around I do is: In this case, where we _know_ it's a slot, it must have
			a parent node that does not get animated.
		*/
		if(node.childNodes.length > 1) {
			console.error("Due to bug in Svelte, passed in node (if a <slot>) can only have one child that gets animated.");
			return;
		}

		// Get only child and animate that (see above).
		node = node.childNodes[0];

		const getNodes = (n) =>
		{
			let c, start;
			for(let i = 0; i < n.childNodes.length; i++) {
				c = n.childNodes[i];

				start = contentLength;
				if(c.nodeType === Node.TEXT_NODE) {
					contentLength += c.textContent.length;
					nodeMeta.push({
						"start" : start,
						"length" : c.textContent.length,
						"parent" : c.parentNode,
						"text" : c.textContent,
						"node" : null
					});
					c.textContent = "";
				} else {
					contentLength += 1;
					nodeMeta.push({
						"start" : start,
						"length" : 1,
						"parent" : c.parentNode,
						"text" : null,
						"node" : c
					});
				}

				if(c.childNodes.length > 0) {
					getNodes(c);
				}
			}
		}

		getNodes(node);

		node.innerHTML = "";

		console.log("nodeMeta", nodeMeta, nodeMeta.length, contentLength);

		var currStart = 0, prevPos = -1;
		const duration = contentLength * speed;

		return {
			duration,
			tick: (t) => {
				var pos = ~~(contentLength * t), guard = 0, meta;

				while(prevPos < pos && guard++ < 500) {
					meta = nodeMeta[0];
					if(!meta) {
						break;
					}

					if(meta.text !== null) {
						meta.parent.appendChild(document.createTextNode(
							meta.text.slice(prevPos - currStart, prevPos+1 - currStart)
						));
					} else {
						meta.parent.appendChild(meta.node);
					}

					prevPos++;

					if(prevPos === (meta.start + meta.length)) {
						nodeMeta.shift();
						currStart = prevPos;
					}
				}

				if(guard >= 499) {
					throw new Error("500 iterations in one step. Bug or not. Let's be sensible; give it more time.");
				}

				prevPos = pos;
			}
		};

	}


	function spin(node, { duration }) {
		return {
			duration,
			css: t => {
				const eased = quadOut(t);

//					transform: rotate(${eased * -3}deg);
				return `
					color: hsl(
						${~~(t * 360)},
						${Math.min(100, 1000 - 1000 * t)}%,
						${Math.min(50, 500 - 500 * t)}%
					);`
			}
		};
	}

</script>

{#if showButton}
<!--
	<div class="button" class:active={visible} bind:this={label} on:click={open}>
		{name}
	</div>
-->
	<div bind:this={label} >
		<Button label={name} style="square" bind:pressed={visible} on:click={open}></Button>
	</div>

	<div bind:this={content} style={contentPos} class="outer" out:fade>
		{#if visible}
			<!--div class="content" transition:scale="{{start:0.25}}" -->
			<div class="content" in:typewriter="{{speed: 6}}" out:scale>
				<slot></slot>
			</div>
		{/if}
	</div>
{/if}

<style>
	.active {
		border: 1px solid #bb0 !important;
	}
	.button {
		padding: 5px;
		background-color: rgba(0, 0, 0);
		border-radius: 5px;
		margin: 2px;
		border: 1px solid #335;
	}

	.button:hover {
		cursor: pointer;
		color: #ddf;
	}

	.content {
		background-image:
			url("https://arwes.dev/static/img/glow.png"),
			url("https://arwes.dev/static/img/background.jpg")
		;
		background-repeat: repeat, auto;
		background-position: center top, center top;
		background-attachment: fixed, auto;
		background-size: auto, cover;

		width: 60vw;
		height: auto;
		background-color: rgba(3, 3, 3, 0.6);
		padding: 25px;
		border-radius: 4px;
		overflow-y: auto;
		max-height: 600px;
		border: 1px solid rgba(104, 220, 233, 0.7);

		opacity: 0.8;
		/*
		box-shadow: 0 0 5px rgba(0,0,0);
		*/
	}

</style>