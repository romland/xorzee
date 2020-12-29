<script>
	export let points;
	export let width;
	export let height;

	let strPoints = "";

	console.log("PolyShow (original)", points);

	// scale polygon to current resolution
	points = scalePolygon(points, {width:1920,height:1088}, {width: width, height: height}, 16, true)

	console.log("PolyShow (scaled)", points);

	for(let i = 0; i < points.length; i++) {
		if(strPoints.length > 0) {
			strPoints += " ";
		}
		// TODO: Scale to current resolution (these come in 1920x1088)
		strPoints += Math.round(points[i].x) + "," + Math.round(points[i].y);
	}

	/**
	 * NOTE: This method also sits on server in lib/util.js
	 * 
	 * This will never work great with fish-eye lens (need remapping for that) -- but the 
	 * shape that is on the server is on the client.
	 */
    function scalePolygon(polygon, currentResolution, targetResolution, roundToNearest = 16, copy = false)
    {
        let wr = targetResolution.width / currentResolution.width;
        let hr = targetResolution.height / currentResolution.height;

        let p;

        if(copy) {
            p = polygon.map( (n) => {
                return { x: n.x, y: n.y };
            });

        } else {
            p = polygon;
        }

        for(let i = 0; i < p.length; i++) {
            if(roundToNearest > 0) {
                p[i].x *= wr;
                p[i].y *= hr;
            } else {
                // Rounds to nearest N and 0 decimals
                p[i].x = Math.round(
                    Math.round( (p[i].x * wr) / roundToNearest) * roundToNearest
                );
                p[i].y = Math.round(
                    Math.round( (p[i].y * hr) / roundToNearest) * roundToNearest
                );
            }
        }

		return p;
	}


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

