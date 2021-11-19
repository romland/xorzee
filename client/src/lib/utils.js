"use strict";

/*
// example:
<from html element> : {
	to : [ ... ],
	notify : [ ... ]
}
*/
var connections = [];

export function copyGeography(from, to)
{
	let vsRect = from.getBoundingClientRect();
	// let totBorderSize = 2;
	let totBorderSize = 0;
	let styles = {
		position	: "absolute",
		// left		: (vsRect.left + window.pageXOffset) + "px",
		// top			: (vsRect.top + window.pageYOffset) + "px",
		width		: vsRect.width - totBorderSize + "px",
		height		: vsRect.height - totBorderSize + "px",
		// transform	: from.style.transform
	};

	for(let s in styles) {
		to.style[s] = styles[s];
	}
}

export function updateAllGeography()
{
	// let froms = Object.keys(connections);
	for(var i = 0; i < connections.length; i++) {
		let from = connections[i].from;
		for(let j = 0; j < connections[i].to.length; j++) {
			copyGeography(from, connections[i].to[j]);
		}

		let style = window.getComputedStyle(from, null);
		for(let j = 0; j < connections[i].notify.length; j++) {
			// size without border padding
			connections[i].notify[j](style.getPropertyValue("width"), style.getPropertyValue("height"), from);
		}
	}
}

export function addGeographyFollower(from, to, notify)
{
	if(!from) {
		throw new Error("no 'from'");
	}

	let con = getConnection(from);
	if(!con) {
		throw new Error("No such from was previously added");
	}

	if(to) {
		if(!Array.isArray(to)) {
			to = [ to ];
		}

		con.to.push(...to);
	}

	if(notify) {
		if(!Array.isArray(notify)) {
			notify = [ notify ];
		}

		con.notify.push(...notify);
	}
}

/**
 * on resize, all entries in 'notify' will be called with args:
 *  new width, new height, 'from'
 */
export function followGeography(from, to, notify)
{
	let con = getConnection(from);
	if(!con) {
		con = {
			from : from,
			to : [],
			notify : [],
		};
		connections.push(con);
	}

	addGeographyFollower(from, to, notify);

	let copyGeo = () => {
		// console.log("copyGeo() to", _to);
		for(let i = 0; i < con.to.length; i++) {
			copyGeography(from, con.to[i]);
		}
	};

	let notifyGeo = () => {
		let style = window.getComputedStyle(from, null);
		for(let i = 0; i < con.notify.length; i++) {
			// size without border padding
			con.notify[i](style.getPropertyValue("width"), style.getPropertyValue("height"), from);
		}
	};
/*
	window.onresize = (e) => {
		copyGeo();
		notifyGeo();
		console.log("window resize", from);
	};
*/
	new ResizeObserver((elt) => {
		// resized element sits in elt[0].target
		copyGeo();
		notifyGeo();
	}).observe(from);

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


export function pad(num)
{
	var norm = Math.floor(Math.abs(num));
	return (norm < 10 ? '0' : '') + norm;
}


export function utcToDateTime(utc, verbose = true)
{
	// const timeZoneoffset = (-d.getTimezoneOffset()/60);
	if(!utc) {
		return translate("Unknown");
	}

	const d = new Date(utc);
	const t = d.toLocaleTimeString('nl-NL');

	return `${d.toLocaleDateString()} ${t.substr(0, 5)}` + (verbose ? `:${pad(d.getSeconds())}` : '');
}


function getConnection(ob)
{
	for(let i = 0; i < connections.length; i++) {
		if(ob === connections[i].from) {
			return connections[i];
		}
	}
	return null;
}


/**
 * Authorization:
 * e.g. 'can user delete clip'
 */
export function can(user, action, target)
{
	// TODO: _nothing_ is done around this on server
	return true;
}