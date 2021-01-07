<script>
	import { scale } from "svelte/transition";
	import { fade } from 'svelte/transition';
	import { elasticOut, quadOut } from 'svelte/easing';

	export let name, visible, showButton, position = "below";

	let label, content, contentPos;

	let unique = {};
	function open()
	{
		unique = {};
		
		if(!visible) {
			const rect = label.getBoundingClientRect();

			switch(position) {
				case "below" :
					contentPos = `position: absolute; left: ${rect.left}px; top: ${rect.height}px;`;
					break;

				case "above" :
					contentPos = `position: absolute; left: ${rect.left}px; bottom: ${rect.height}px;`;
					break;

				default :
					console.error("Unsupported position", position);
					break;
			}
		}

		visible = !visible;
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

			Work-arounds tested:
			- removing nodes with removeNode() instead
			- backing up nodes to keep references around

			To try:
			- When animation done, re-insert original nodes (don't see why this would help
			  since no nodes are actually _destroyed_)
		*/
		if(node.childNodes.length > 1) {
			throw new Error("Due to bug in Svelte, passed in node can only have one child that gets animated.");
		}

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
	{#key unique}
		<div bind:this={label} on:click={open}>
			{name}
		</div>
	{/key}

	<div bind:this={content} style={contentPos}>
		{#if visible}
			<!--div class="content" transition:scale="{{start:0.25}}" -->
			<div class="content" in:typewriter="{{speed: 4}}" out:fade>
				<slot></slot>
			</div>
		{/if}
	</div>
{/if}

<style>
	.content {
		width: 60vw;
		height: 5vh;
		background-color: rgba(3, 3, 3, 128);
	}

	.box {
		
		background-color: blue;
		
		animation-name: spin;
		animation-duration: 4000ms;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0);
		}
		
		to {
			transform: rotate(360deg);
		}
	}

</style>