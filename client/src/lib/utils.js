"use strict";

export function copyGeography(from, to)
{
	let vsRect = from.getBoundingClientRect();
	let totBorderSize = 2;
	let styles = {
		position	: "absolute",
		left		: (vsRect.left + window.pageXOffset) + "px",
		top			: (vsRect.top + window.pageYOffset) + "px",
		width		: vsRect.width - totBorderSize + "px",
		height		: vsRect.height - totBorderSize + "px"
	};

	for(let s in styles) {
		to.style[s] = styles[s];
	}
}
