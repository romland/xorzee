<script>
	export let points;
	let strPoints = "";

	console.log("PolyShow", points);
	for(let i = 0; i < points.length; i++) {
		if(strPoints.length > 0) {
			strPoints += " ";
		}
		// TODO: Scale to current resolution (these come in 1920x1088)
		strPoints += points[i].x + "," + points[i].y;
	}

</script>

	<svg id="svg"
		height="100%"
		width="100%"
		style=""
	>
		<polyline id="polyline"
			style="
				fill: #33333350;
				stroke: black;
				stroke-width: 1
			"
			points={strPoints}
		/>
	</svg>
