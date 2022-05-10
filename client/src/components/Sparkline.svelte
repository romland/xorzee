<script>
	export let data = [];
	export let maxWidth = 100;
	export let maxHeight = 15000;
	export let height = '5.25rem';
	export let marginTop = '0px';
	export let width = 100;
	export let strokeWidth = 4;
	export let color = '#4caf50';
	export let colorDanger = '#f44336';

	let pointData = "";
	let minValue = Infinity;
	let maxValue = -Infinity;

$:	if(data.length) {
		minValue = Infinity;
		maxValue = -Infinity;
		pointData = "";
		console.log(data);
		for(let i = 0; i < data.length; i++) {
			pointData += `${i*(width/data.length)},${maxHeight - data[i].frameInfo.totalMagnitude} `;

			if(data[i].frameInfo.totalMagnitude > maxValue) {
				maxValue = data[i].frameInfo.totalMagnitude;
			}

			if(data[i].frameInfo.totalMagnitude < minValue) {
				minValue = data[i].frameInfo.totalMagnitude;
			}
		}

		/*
		frameInfo
			candidates: 7
			ignoredVectors: 0
			nullFrame: false
			totalMagnitude: 42
		history
			.length
		clusters
			.length
		*/

		maxValue = Math.max(maxHeight, (Math.round(maxValue / 1000) * 1000) + 1000);

		// console.log(data[data.length-1].frameInfo.totalMagnitude);
	}
</script>

<div style="position: absolute; bottom: {marginTop}; z-index: 100; border: 1px solid #ccc;">
	<svg viewBox="0 0 {maxWidth} {maxValue}"
		style="width: {width}px; height: {height}; vertical-align: middle;"
		preserveAspectRatio="none">
		<polyline stroke-linecap="round" style="stroke: {color}; stroke-width: {strokeWidth}" points="{pointData}"></polyline>
	</svg>
	<div style="padding-right: 2px; text-align: right; width: 20px; font-size: 8px; position: absolute; right: 0; top: 0;">
		{maxValue/1000}k
	</div>
</div>

<style>
	polyline {
		fill: none;
	}
	svg {
		background-color: black;
	}

</style>