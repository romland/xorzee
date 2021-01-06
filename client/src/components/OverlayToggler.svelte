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

	// Speed is per character,
	// Bug: We do not print last character/node
	function typewriter(node, { speed = 50 })
	{
		const nodeMeta = [];
		var contentLength = 0;

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
					// XXX: Do I want this check -before- the node-type check?
				}

			}
		}

		getNodes(node);
		console.log("nodeMeta", nodeMeta, nodeMeta.length, contentLength);

		const duration = contentLength * speed;

		var currIndex = 0;
		var currStart = 0;
		var prevPos = -1;

		node.innerHTML = "";

		return {
			duration,
			tick: (t) => {
				var pos = ~~(contentLength * t);
				var guard = 0;

				if(prevPos === pos) {
					return;
				}

				// while((pos - prevPos) >= 0 && guard++ < 500) {
				while(prevPos < pos && guard++ < 500) {
					if(!nodeMeta[currIndex]) {
						console.log("Reached last node?");
						break;
					}

					if(nodeMeta[currIndex].text !== null) {
						let char = document.createTextNode(
							nodeMeta[currIndex].text.slice((prevPos - currStart), ((prevPos+1) - currStart))
						);
						// console.log("slice", (prevPos - currStart), "-", ((prevPos+1) - currStart), ":", char);
						nodeMeta[currIndex].parent.appendChild(char);
					} else {
						// HTML node
						nodeMeta[currIndex].parent.appendChild(nodeMeta[currIndex].node);
					}

					if(prevPos === (nodeMeta[currIndex].start + nodeMeta[currIndex].length)) {
						currIndex++;
						currStart = prevPos + 1;
					}

					prevPos++;
				}

				if(guard >= 499) {
					throw new Error("HIT GUARD");
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
			<div class="content" in:typewriter="{{speed: 4}}">
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