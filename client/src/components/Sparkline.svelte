<script>
	export let data = [];
	export let maxWidth = 100;
	export let maxHeight = 15000;
	export let height = '1.25rem';
	export let marginTop = '0px';
	export let width = 100;
	export let strokeWidth = 8;
	export let color = '#4caf50';
	export let colorDanger = '#f44336';

	let pointData = "";

$:	if(data.length) {
		pointData = "";
		for(let i = 0; i < data.length; i++) {
			pointData += `${i*(width/data.length)},${maxHeight - data[i].frameInfo.totalMagnitude} `;
		}
		// console.log(data[data.length-1].frameInfo.totalMagnitude);
	}
</script>

<svg viewBox="0 0 {maxWidth} {maxHeight}"
	style="width: {width}px; height: {height};vertical-align: middle; position:absolute; top: {marginTop}; z-index: 100;"
	preserveAspectRatio="none">
	<polyline style="stroke: red; stroke-width: 2" points="{pointData}"></polyline>
</svg>

<style>
	polyline {
		fill: none;
		stroke: black;
	}
	svg {
		background-color: black;
	}

</style>