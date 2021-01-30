<script>
	import { onMount } from 'svelte';
	import { scalePolygon } from "../lib/utils";

	export let points;
	export let width;
	export let height;

	let strPoints = "";

	onMount(() => {
		// console.log("PolyShow (original)", points);
		let svgRect = svg.getBoundingClientRect();

		// scale polygon to wanted resolution (coordinates are always stored in 1920x1088 format)
		points = scalePolygon(points, {width: 1920, height: 1088}, {width:svgRect.width,height:svgRect.height}, 16, true)

		console.log("PolyShow (scaled)", points);

		for(let i = 0; i < points.length; i++) {
			if(strPoints.length > 0) {
				strPoints += " ";
			}
			strPoints += Math.round(points[i].x) + "," + Math.round(points[i].y);
		}
	});

</script>

	<svg id="svg"
		width="100%"
		height="100%"
		style=""
		viewBox="0 0 {width} {height}"
	>
		<g fill="none" fill-rule="evenodd">
			<polyline id="polyline"
				style="
					fill: #ff000030;
					stroke: black;
					stroke-width: 1
				"
				points={strPoints}
			/>
		</g>
	</svg>

