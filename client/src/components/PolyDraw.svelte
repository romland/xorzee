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

	function getMousePosition(e)
	{
		// XXX:
		// We have to do this every time because the object we are act as overlay on might change.
		// Best would be to pass in an event to this component when that changes, but ... later.
		svgRect = svg.getBoundingClientRect();

		if(GRID) {
			return {
				x :	(Math.round((e.pageX - svgRect.left) / GRID_SIZE) * GRID_SIZE),
				y :	(Math.round((e.pageY - svgRect.top) / GRID_SIZE) * GRID_SIZE)
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
		if(done) {
			console.log("restarting!");
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
		var curr = getMousePosition(e);

		if(e.button === 2) {
			return;
		}

		if(prev && curr.x === prev.x && curr.y === prev.y) {
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

			dispatch('complete', {
				data : polygon
			});
			
			return true;
		}

		let pts = polyline.getAttribute('points') || '';

		const newPoint = `${curr.x},${curr.y} `;
        pts += newPoint;
		polyline.setAttribute('points',pts); 

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


</script>

	<svg id="svg"
			on:contextmenu={(e)=>{ return false}}
			on:mousemove={mouseMove}
			on:mousedown|preventDefault|stopPropagation={mouseDown}
			on:mouseup|preventDefault|stopPropagation={mouseUp}
			height="100%"
			width="100%"
			style="
			"
		>

		<defs>
			<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
				<rect width={GRID_SIZE} height={GRID_SIZE} fill="url(#smallGrid)"/>
				<path d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}" fill="none" stroke="gray" stroke-width="0.5"/>
			</pattern>
		</defs>
	
		<polyline id="polyline"
			style="
				fill: #33333350;
				stroke: black;
				stroke-width: 1
			"
		/>

		<line id="templine" style="
			fill:yellow;
			stroke:black;
			stroke-width:1;
		"/>

    <rect width="100%" height="100%" fill="url(#grid)" />
	
	</svg>
	double-click to stop adding vertices
