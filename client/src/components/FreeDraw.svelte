<svelte:window on:resize="{resize}"/>
<div class="colorSection">
  {#each 'red black green blue'.split(' ') as b}
    <div class="circle" class:active={color === b} style="{`background: ${b};`}" on:click={() => color = b}></div>
  {/each}
</div>
<button class="neu" on:click={
				() => {
					paths = paths.concat(curPath)
					collection = collection.concat([paths])
					curPath = {}
					paths = []}}
	>New {collection.length}</button>
  <svg bind:this={svg} class="svg"
    on:pointerdown={down}
    on:pointermove={move}
		on:pointerup={up}
    >
    {#each paths as p}
      <path stroke-width={strokeWidth} d="{p.strPath}" stroke="{p.color}" fill="transparent" />
    {/each}
    <path stroke-width={strokeWidth} d="{curPath.strPath}" stroke="{curPath.color}" fill="transparent" />
  </svg>
<script>
// basically this SO answer in svelte: https://stackoverflow.com/a/40700068/492969

import { onMount } from 'svelte';
let curPath = {}
let paths = [], collection = []
let strokeWidth = 2;
let bufferSize = 4
let active = false
let color = 'black'
let svg, rect
let buffer = []; // Contains the last positions of the mouse cursor
onMount(resize);
const up = () =>	{active = false;  }
const move = (e) => {
      if (active) {
      appendToBuffer(getMousePosition(e));
      updateSvgPath();
      }
    }
const down = (e) => {
      active = true
      paths = paths.concat(curPath)
      curPath = {}
      buffer = [];
      const pt = getMousePosition(e);
      appendToBuffer(pt);
      curPath.strPath = "M" + pt.x + " " + pt.y;
      curPath.color = color
    }
function resize() { rect = svg.getBoundingClientRect();}
const getMousePosition = (e) => ({ x: e.pageX - rect.left, y: e.pageY - rect.top })

const appendToBuffer = (pt) => {
    buffer.push(pt);
    while (buffer.length > bufferSize) {
        buffer.shift();
    }
};

// Calculate the average point, starting at offset in the buffer
const getAveragePoint = (offset)  => {
    const len = buffer.length;
    if (len % 2 === 1 || len >= bufferSize) {
        let totalX = 0;
        let totalY = 0;
        let pt, i;
        let count = 0;
        for (i = offset; i < len; i++) {
            count++;
            pt = buffer[i];
            totalX += pt.x;
            totalY += pt.y;
        }
        return {
            x: totalX / count,
            y: totalY / count
        }
    }
    return null;
};

const updateSvgPath = () => {
    let pt = getAveragePoint(0);

    if (pt) {
        // Get the smoothed part of the path that will not change
        curPath.strPath += " L" + pt.x + " " + pt.y;

        // Get the last part of the path (close to the current mouse position)
        // This part will change if the mouse moves again
        let tmpPath = "";
        for (let offset = 2; offset < buffer.length; offset += 2) {
            pt = getAveragePoint(offset);
            tmpPath += " L" + pt.x + " " + pt.y;
        }
        // Set the complete current path coordinates
        curPath.strPath + tmpPath;
    }
};
</script>
<style>
.svg { box-sizing: border-box; height: -webkit-fill-available; width: -webkit-fill-available; touch-action: none }
.circle { width: 30px; height: 30px; border-radius: 50%; display: inline-block; margin: 3px; cursor: pointer; }
.active { border: 3px ; border-radius: 1px; }
.neu { position: absolute; left: 10px; bottom: 8px; }
.colorSection { position: absolute; left: 200px; bottom: 12px; }
</style>
