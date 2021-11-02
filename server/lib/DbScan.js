/**
	Useage:

	const scanner = new DbScan();
	scanner.setEps(2);
	scanner.minPts(4);
	scanner.setDistance("Manhattan");
	scanner.setData(...);
	const results = scanner.run();
 */
"use strict";

const performance = require('perf_hooks').performance;

class DbScan
{
	constructor()
	{
		this.eps = 2;
		this.minPts = 4;
		this.distance = this.euclideanDistance;
		this.data = [];

		this.clusters = [];
		this.results = [];
	}

	setData(d)
	{
		this.data = d;
	}

	setEps(e)
	{
		this.eps = e;
	}

	setMinPts(p)
	{
		this.minPts = p;
	}

	setDistance(fn)
	{
		switch(fn) {
			case 'Euclidean' :
				this.distance = this.euclideanDistance;
				break;

			case 'Manhattan' :
				this.distance = this.manhattanDistance;
				break;

			default :
				this.distance = fn;
				break;
		}
	}

	run()
	{
		this.results = new Uint16Array(this.data.length).fill(0xffff);//[];
		this.clusters = [];

		let neighbours, num_neighbours, cluster_idx;

		for(let i = 0; i < this.data.length; i++) {
			if(this.results[i] === 0xffff) {
				this.results[i] = 0;					// visited and marked as noise by default
				neighbours = this.getRegionNeighbours(i);
				num_neighbours = neighbours.length;

				if(num_neighbours < this.minPts) {
					this.results[i] = 0;				// noise
				} else {
					this.clusters.push([]);				// empty new cluster
					cluster_idx = this.clusters.length;
					this.expand(i, neighbours, cluster_idx);
				}
			}
		}

		return this.results;
	}

	expand(pointId, neighbours, clusterId)
	{
		this.clusters[clusterId - 1].push(pointId);		// add point to cluster
		this.results[pointId] = clusterId;				// assign cluster id

		let curr_neighbours, curr_num_neighbours, curr_point_idx;

		for(let i = 0; i < neighbours.length; i++) {
			curr_point_idx = neighbours[i];

			if(this.results[curr_point_idx] === 0xffff) {
				this.results[curr_point_idx] = 0;		// visited and marked as noise by default
				curr_neighbours = this.getRegionNeighbours(curr_point_idx);
				curr_num_neighbours = curr_neighbours.length;

				if(curr_num_neighbours >= this.minPts) {
					this.expand(curr_point_idx, curr_neighbours, clusterId);
				}
			}

			if(this.results[curr_point_idx] < 1) {
				// not assigned to a cluster but visited (= 0)
				this.results[curr_point_idx] = clusterId;
				this.clusters[clusterId - 1].push(curr_point_idx);
			}
		}
	}

	getRegionNeighbours(pointId)
	{
		const neighbours = [];
		let d = this.data[pointId];
		let i = 0;
		let dlen = this.data.length;

		// This is a _very_ hot code path.
		for(; i < dlen; i++) {
			if(pointId === i) {
				continue;
			}

			// The pre-check before calling distance  will actually cut
			// execution time down to 50% (and more in quiet scenarios). It
			// also seems to make execution time a little more predictable.
			// The downside is that it makes epsilon mean something else.
			if(Math.abs(this.data[i].x - d.x) < this.eps
//				&& Math.abs(this.data[i].y - d.y) < this.eps
				&& this.distance(this.data[i], d) <= this.eps) {
				neighbours.push(i);
			}
		}

		return neighbours;
	}

	euclideanDistance(point1, point2)
	{
		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	}

	manhattanDistance(point1, point2)
	{
		return Math.abs(point2.x - point1.x) + Math.abs(point2.y - point1.y);
	}
}

module.exports = DbScan;
