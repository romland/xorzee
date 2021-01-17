<script>
	import { onMount } from 'svelte';
	import { getOutline } from "../lib/convex-hull";
	import { createEventDispatcher } from 'svelte';

	var svgRect;
	let downAt, prev;
	let done = false;
	
	const MOUSE_DOWN_DRAG_UP = false
	const GRID = true;
	const GRID_SIZE = 16;
	const dispatch = createEventDispatcher();

	let scrollLeft, scrollTop;
	let svg, polyline, templine;

	function getMousePosition(e)
	{
		// XXX:
		// We have to do this every time because the object we are act as overlay on might change.
		// Best would be to pass in an event to this component when that changes, but ... later.
		svgRect = svg.getBoundingClientRect();

		if(GRID) {
			return {
				x :	(Math.round((e.pageX - svgRect.left - scrollLeft) / GRID_SIZE) * GRID_SIZE),
				y :	(Math.round((e.pageY - svgRect.top - scrollTop) / GRID_SIZE) * GRID_SIZE)
			};
		} else {
			return {
				x :	e.pageX - svgRect.left,
				y :	e.pageY - svgRect.top
			};
		}
	}

	function mouseDown(e)
	{
		if(movingPoint !== null) {
			console.log("ignoring down; moving point", movingPoint);
			return;
		}

		if(done) {
			console.log("restarting!");
			movablePoints = [ ];
			movingPoint = null;
			prev = null;
//			polyline.setAttribute("style", "fill", "#33333350");
			polyline.setAttribute('points', "" ); 
//			templine.setAttribute("style", "display", "auto");
			downAt = null;
			done = false;
			return;
		}

		if(e.button === 2) {
			return false;
		}

		var curr = getMousePosition(e);
		downAt = curr;

		return false;
	}

	function polylineToArray(pl)
	{
		var ns;
		var pairs = (pl.getAttribute("points") || "").trim().split(" ");
		var coords = pairs.map( (p) => {
			ns = p.split(",");
			return { x : parseInt(ns[0], 10), y : parseInt(ns[1], 10) };
		});
		return coords;
	}

	function arrToPolylineStr(arr)
	{
		// Complete the poly: add first to last
		if(arr[0].x !== arr[arr.length-1].x && arr[0].y !== arr[arr.length-1].y) {
			arr.push(arr[0]);
		}

		var hullStr = "";
		for(let i = 0; i < arr.length; i++) {
			if(hullStr.length > 0) {
				hullStr += " ";
			}
			hullStr += `${arr[i].x},${arr[i].y}`;
		}

		return hullStr;
	}

	function polylineToConvexHull(pl)
	{
		// God, this is tedious: string -> coordinates -> convex hull -> string
		var str = arrToPolylineStr(
			getOutline(
				polylineToArray(pl)
			)
		);

		pl.setAttribute('points', str );
	}

	function clearLine(l)
	{
		l.setAttribute('x1', 0);
		l.setAttribute('y1', 0);
		l.setAttribute('x2', 0);
		l.setAttribute('y2', 0);
	}

	function mouseUp(e)
	{
		if(movingPoint !== null) {
			movablePointMouseUp(e);
			return;
		}

		var curr = getMousePosition(e);

		if(e.button === 2) {
			return;
		}

		if(prev && curr.x === prev.x && curr.y === prev.y) {
			// Completing polygon
			console.log("Clicked same to flag polygon as done");
			polylineToConvexHull(polyline);

//			polyline.setAttribute("style", "fill", "#88333350");
			clearLine(templine);
			downAt = null;
			done = true;

			let polygon = {
				resolution : {
					width : svgRect.width,
					height : svgRect.height
				},
				points : polylineToArray(polyline)
			};

			setMovablePoints(polygon.points);

			try {
				dispatch('complete', {
					data : polygon
				});
			} catch(ex) {
				console.log("Error: Failed to dispatch completion of polygon", ex);
			}
			
			return true;
		}

		let pts = polyline.getAttribute('points') || '';

		const newPoint = `${curr.x},${curr.y} `;
        pts += newPoint;
		polyline.setAttribute('points',pts); 

		addMovablePoint(curr);

		if(MOUSE_DOWN_DRAG_UP) {
			// mousedown/drag/mouseup drawing
			clearLine(templine);
			downAt = null;
		} else {
			// mousedown/mousedown drawing
			downAt = curr;
		}

		prev = { x : curr.x, y : curr.y };
		return true;
	}

	function mouseMove(e)
	{
		if(movingPoint !== null) {
			mouseMovePoint(e);
		}

		if(done) {
			return;
		}

		if(downAt) {
			var curr = getMousePosition(e);

			templine.setAttribute('x1', downAt.x);
			templine.setAttribute('y1', downAt.y);
			templine.setAttribute('x2', curr.x);
			templine.setAttribute('y2', curr.y);
		}
	}

	let movablePoints = [ ];
	let movingPoint = null;

	function setMovablePoints(polygon)
	{
		console.log("Setting movable points");
		movablePoints = [];
		// Don't add last point as that one is implicit in a polygon
		for(let i = 0; i < (polygon.length - 1); i++) {
			movablePoints.push({
				x: polygon[i].x,
				y: polygon[i].y
			});
		}
		console.log("new movables", movablePoints);
		movablePoints = movablePoints;
	}

	function addMovablePoint(pos)
	{
		console.log("add movable point", pos);
		movablePoints.push({
			x: pos.x,
			y: pos.y
		});
		movablePoints = movablePoints;
	}

	function movablePointMouseDown(e)
	{
		// search for which lines this applies to (store indices)
		let index = parseInt(e.target.attributes["data-id"].nodeValue, 10);
		console.log("movable down", e, index);
		movingPoint = index;
	}

	function movablePointMouseUp(e)
	{
		console.log("movable up", e);
		movingPoint = null;
	}

	function mouseMovePoint(e)
	{
		var curr = getMousePosition(e);

		// find (and update) all lines connecting to this vertex
		polyline.setAttribute(
			'points',
			polyline.getAttribute('points').replaceAll(movablePoints[movingPoint].x+","+movablePoints[movingPoint].y, curr.x+","+curr.y)
		);

		polyline.getAttribute('points') || '';


		movablePoints[movingPoint].x = curr.x;
		movablePoints[movingPoint].y = curr.y;

	}


</script>

	<svelte:window bind:scrollX={scrollLeft} bind:scrollY={scrollTop}></svelte:window>

<!--
-->
	<svg bind:this={svg}
			on:contextmenu={(e)=>{ return false}}
			on:mousemove={mouseMove}
			on:mousedown={mouseDown}
			on:mouseup={mouseUp}
			height="100%"
			width="100%"
			style=""
		>

		<defs>
			<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
				<rect width={GRID_SIZE} height={GRID_SIZE} fill="url(#smallGrid)"/>
				<path d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}" fill="none" stroke="gray" stroke-width="0.5"/>
			</pattern>
		</defs>

		<polyline bind:this={polyline}
			style="
				fill: #33333350;
				stroke: black;
				stroke-width: 1
			"
		/>

		<line bind:this={templine} style="
			fill:yellow;
			stroke:black;
			stroke-width:1;
		"/>

	    <rect width="100%" height="100%" fill="url(#grid)" />

		{#if done}
			{#each movablePoints as point, i}
				<circle
					style="fill:yellow"
					cx={point.x} cy={point.y} r="7"
					on:mousedown={movablePointMouseDown}
					data-id={i}
				/>
			{/each}
		{/if}

	</svg>

Instructions:
- click on same spot twice to end the polygon (it will be converted to a simplified convex hull)
