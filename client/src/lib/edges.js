/**
 * Find the convex hull of a set of points, then draw lines around the set.
 * 
 * https://stackoverflow.com/questions/13802203/draw-a-border-around-an-arbitrarily-positioned-set-of-shapes-with-raphaeljs
 */
"use strict";

	export function outlineAll(context, rs, clusters)
	{
		let ps;
		for(let i = 0; i < clusters.length; i++) {
			// HACK: Need to make convex-hullification use x/y attrs.
			ps = [];
			for(let j = 0; j < clusters[i].points.length; j++) {
				ps.push( [ clusters[i].points[j].x * rs, clusters[i].points[j].y * rs ] );
			}
			outline(context, ps);
		}
	}

	export function outline(context, points)
	{
		if(points.length < 2) {
			return;
		}

		var outline = convex_hull(points),
			point;
		
		if(outline.length < 2) {
			return;
		}

		context.beginPath();
		context.moveTo(outline[0][0], outline[0][1]);
		for (var i = 0; i < outline.length; i++) {
			point = outline[i];
			context.lineTo(point[0], point[1]);
		}

		context.strokeStyle = "#FFFF00ff";
		context.stroke();
	}

	function cmp(x, y)
	{
        if (x > y) {
            return 1;
        } else if (x < y) {
            return -1;
        } else {
            return 0;
        }
	} 
	
	function turn(p, q, r)
	{
        return cmp((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]), 0);
    }
	
	function dist(p, q)
	{
        var dx = q[0] - p[0];
        var dy = q[1] - p[1];
        return dx * dx + dy * dy;
    }
	
	function next_hull_pt(points, p)
	{
        var q = p,
            r,
            t;
        for (var i = 0; i < points.length; i++) {
            r = points[i];
            t = turn(p, q, r);
            if (t == -1 || t == 0 && dist(p, r) > dist(p, q)) {
                q = r;
            }
        }
        return q;
    }
	
	function convex_hull(points)
	{
        var left,
            point;
        for (var i = 0; i < points.length; i++) {
            point = points[i];
            if (!left || point[0] < left[0]) {
                left = point;
            }
        }
        var hull = [left],
            p,
            q;
        for (var i = 0; i < hull.length; i++) {
            p = hull[i];
            q = next_hull_pt(points, p);
            if (q[0] != hull[0][0] || q[1] != hull[0][1]) {
                hull.push(q);
            }
        }
        hull.push(left);
        return hull;
    }
