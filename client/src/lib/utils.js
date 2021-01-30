"use strict";

var _from, _to = [], _notify = [];

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

export function addGeographyFollower(to, notify)
{
	if(!_from) {
		throw new Error("Not initialized with a 'from'");
	}

	if(to) {
		_to.push(to);
	}

	if(notify) {
		_notify.push(notify);
	}
}

/**
 * on resize, all entries in 'notify' will be called with args:
 *  new width, new height, 'from'
 */
export function followGeography(from, to, notify)
{
	if(!Array.isArray(to) && to) {
		to = [ to ];
	}

	if(!Array.isArray(notify) && notify) {
		notify = [ notify ];
	}

	if(from)
		_from = from;
	if(to && to.length)
		_to = to;
	if(notify && notify.length)
		_notify = notify;

	let copyGeo = () => {
		// console.log("copyGeo() to", _to);
		for(let i = 0; i < _to.length; i++) {
			copyGeography(_from, _to[i]);
		}
	};

	let notifyGeo = () => {
		let style = window.getComputedStyle(_from, null);
		for(let i = 0; i < _notify.length; i++) {
			// size without border padding
			_notify[i](style.getPropertyValue("width"), style.getPropertyValue("height"), _from);
		}
	};

	window.onresize = (e) => {
		copyGeo();
		notifyGeo();
	};

	new ResizeObserver((elt) => {
		// resized element sits in elt[0].target
		copyGeo();
		notifyGeo();
	}).observe(_from);

	copyGeo();
	notifyGeo();
}


/**
 * NOTE: This method also sits on server in lib/util.js
 * 
 * This will never work great with fish-eye lens (need remapping for that) -- but the 
 * shape that is on the server is on the client.
 */
export function scalePolygon(polygon, currentResolution, targetResolution, roundToNearest = 16, copy = false)
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
