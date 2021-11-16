<script>
	import { onMount } from 'svelte';
	import { getOutline } from "../lib/convex-hull";
	import { createEventDispatcher } from 'svelte';
	import { scalePolygon } from "../lib/utils";

	export let currentPoints = [];
	export let width, height;
	export let drawing = true;

	let initialized = false;
	var svgRect;
	let downAt, prev;
	let done = true;
	
	let movablePoints = [ ];
	let movingPoint = null;

	const MOUSE_DOWN_DRAG_UP = false
	const GRID = true;
	const GRID_SIZE = 16;
	const dispatch = createEventDispatcher();

	let scrollLeft, scrollTop;
	let svg, polyline, templine;

	function getMousePosition(e)
	{
		// We do this every time because this object act as an overlay and might change.
		// Best would be to pass in an event to this component when that changes, but ... later.
		svgRect = svg.getBoundingClientRect();

		let x = e.pageX;
		let y = e.pageY;

		// Because the SVG can be scaled...
		x *= width / svgRect.width;
		y *= height / svgRect.height;

		if(GRID) {
			return {
				x :	(Math.round((x - svgRect.left - scrollLeft) / GRID_SIZE) * GRID_SIZE),
				y :	(Math.round((y - svgRect.top - scrollTop) / GRID_SIZE) * GRID_SIZE)
			};
		} else {
			return {
				x :	x - svgRect.left,
				y :	y - svgRect.top
			};
		}
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

	function completePolygon(poly)
	{
		// Completing polygon
		polylineToConvexHull(poly);

		clearLine(templine);
		downAt = null;
		done = true;

		let polygon = sendCompletePolygonEvent(polylineToArray(poly));

		setMovablePoints(polygon.points);
	}

	function sendCompletePolygonEvent(points)
	{
		let polygon = {
			resolution : {
				// width : svgRect.width,
				// height : svgRect.height
				width : width,
				height : height
			},
			points : points
		};

		try {
			dispatch('complete', {
				data : polygon
			});
		} catch(ex) {
			console.log("Error: Failed to dispatch completion of polygon", ex);
		}

		return polygon
	}

	function createNewPolygon(e)
	{
		movablePoints = [ ];
		movingPoint = null;
		prev = null;
		polyline.setAttribute('points', "" ); 
		downAt = null;
		done = false;
		return true;
	}

	function mouseDown(e)
	{
		if(movingPoint !== null) {
			return;
		}

		if(done) {
			createNewPolygon(e);
			return;
		}

		if(e.button === 2) {
			return false;
		}

		downAt = getMousePosition(e);

		return false;
	}

	function mouseUp(e)
	{
		if(movingPoint !== null) {
			movablePointMouseUp(e);
			return;
		}

		if(downAt === null) {
			// If no downAt, it means we just cleared previous polygon
			return;
		}
		
		if(e.button === 2) {
			return;
		}

		const curr = getMousePosition(e);

		if(prev && curr.x === prev.x && curr.y === prev.y) {
			completePolygon(polyline);
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


	function setMovablePoints(polygon)
	{
		movablePoints = [];

		// Don't add last point as that one is implicit in a polygon
		for(let i = 0; i < (polygon.length - 1); i++) {
			movablePoints.push({
				x: polygon[i].x,
				y: polygon[i].y
			});
		}

		movablePoints = movablePoints;
	}

	function addMovablePoint(pos)
	{
		movablePoints.push({
			x: pos.x,
			y: pos.y
		});
		movablePoints = movablePoints;
	}

	function movablePointMouseDown(e)
	{
		// get indices of affected lines
		let index = parseInt(e.target.attributes["data-id"].nodeValue, 10);
		movingPoint = index;
	}

	function movablePointMouseUp(e)
	{
		movingPoint = null;
		sendCompletePolygonEvent(movablePoints);
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
	

	function resizePolygon()
	{
		if(false) {
			let svgRect = svg.getBoundingClientRect();

			//(coordinates are always stored in 1920x1088 format)
			let points = scalePolygon(
				currentPoints,
				{ width: 1920, height: 1088 },
				{ width: svgRect.width, height: svgRect.height },
				16,
				true
			);

			for(let i = 0; i < points.length; i++) {
				points[i].x = Math.round(points[i].x);
				points[i].y = Math.round(points[i].y);
			}

			polyline.setAttribute('points', arrToPolylineStr(points));
			setMovablePoints(points);
		} else {
			polyline.setAttribute('points', arrToPolylineStr(currentPoints));
			setMovablePoints(currentPoints);
		}

	}

$:	if(currentPoints && polyline && !initialized) {
		initialized = true;
		resizePolygon();
	}

</script>

	<svelte:window bind:scrollX={scrollLeft} bind:scrollY={scrollTop}></svelte:window>

	<svg class:hide={!drawing} bind:this={svg}
			on:contextmenu={(e)=>{ return false}}
			on:mousemove={mouseMove}
			on:mousedown={mouseDown}
			on:mouseup={mouseUp}
			height="100%"
			width="100%"
			style="margin: 0; padding: 0;"
			viewBox="0 0 {width} {height}"
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

	<svg
		class:hide={drawing}
		width="100%"
		height="100%"
		style="margin: 0; padding: 0;"
		viewBox="0 0 {width} {height}"
	>
		<g fill="none" fill-rule="evenodd">
			<polyline
				style="
					fill: #ff000030;
					stroke: black;
					stroke-width: 1
				"
				points={arrToPolylineStr(currentPoints)}
			/>
		</g>
	</svg>

{#if drawing}
	<pre>
	Instructions:
	- click on same spot twice to end the polygon (it will be converted to a simplified convex hull)

	TODO:
	- pass in existing poly
	- disable double-click when drawing polys
	- add button/function for 'undo'
	- add button/function for 'clear'
	- add button/function for toggling whether to 'disregard' (ignore) or 'regard' (don't ignore)
	- maybe get rid of convex hull wrangling (since it's quite annoying if you actually _need_ a complex area) (need to fix server-side for that)
	</pre>
{/if}

<style>
.hide {
	display: none;
}
</style>