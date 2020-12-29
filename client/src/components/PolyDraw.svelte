<script>
	import { onMount } from 'svelte';
	import { getOutline } from "../lib/convex-hull";


	var svgRect;
	let downAt;
	const MOUSE_DOWN_DRAG_UP = false
	const GRID = true;
	const GRID_SIZE = 16;

	function getMousePosition(e)
	{
		// XXX:
		// We have to do this every time because the object we are act as overlay on might change.
		// Best would be to pass in an event to this component when that changes, but ... later.
		svgRect = svg.getBoundingClientRect();

		if(GRID) {
			return {
				// '- GRID_SIZE'  because we want to be able to select top-most 'cells'.
				x :	(Math.ceil((e.pageX - svgRect.left) / GRID_SIZE) * GRID_SIZE) - GRID_SIZE,
				y :	(Math.ceil((e.pageY - svgRect.top) / GRID_SIZE) * GRID_SIZE) - GRID_SIZE
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
		if(e.button === 2) {
			return false;
		}

		var curr = getMousePosition(e);
		downAt = curr;

		return false;
	}

	function mouseUp(e)
	{
		if(e.button === 2) {
			console.log("right click to flag as done -- TODO: send polygon over to server");
			console.log("polyline", polyline.getAttribute("points"));

			var ns;
			var pairs = polyline.getAttribute("points").trim().split(" ");
			console.log("pairs", pairs);
			pairs.push(pairs[0]);
			console.log("pairs 2", pairs);
			var coords = pairs.map( (p) => {
				ns = p.split(",");
				return [ parseInt(ns[0], 10), parseInt(ns[1], 10) ];
			});
			console.log("coords", coords);

			var hull = getOutline(coords);
			console.log("hull", hull);
			var hullStr = hull.join(" ");
			console.log("hullStr", hullStr);
			polyline.setAttribute('points', hullStr ); 

			console.log("polyline", polyline.getAttribute("points"));

// 288,48 416,448 768,288 
// SERIOUSLY, do I _REALLY_ need to parse that string?

// As for 'complex' polygons -- make it a convex hull (every time a coordinate is added) ..
// so damn hard to find whether a point is inside it otherwise

			downAt = null;
			templine.setAttribute("style", "display", "none");
			return false;
		}

		var curr = getMousePosition(e);
		let pts = polyline.getAttribute('points') || '';

		const newPoint = `${curr.x},${curr.y} `;
        pts += newPoint;
		polyline.setAttribute('points',pts); 

		if(MOUSE_DOWN_DRAG_UP) {
			templine.setAttribute('x1', 0);
			templine.setAttribute('y1', 0);
			templine.setAttribute('x2', 0);
			templine.setAttribute('y2', 0);
			// mousedown/drag/mouseup drawing
			downAt = null;
		} else {
			// mousedown/mousedown drawing
			downAt = curr;
		}

		return false;
	}

	function mouseMove(e)
	{
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
			<pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
				<rect width="16" height="16" fill="url(#smallGrid)"/>
				<path d="M 16 0 L 0 0 0 16" fill="none" stroke="gray" stroke-width="0.5"/>
			</pattern>
		</defs>
	
		<polyline id="polyline" style="
			fill: #33333350;
			stroke:black;
			stroke-width:1
		"/>

		<line id="templine" style="
			fill:yellow;
			stroke:black;
			stroke-width:1;
		"/>

    <rect width="100%" height="100%" fill="url(#grid)" />
	
	</svg>
