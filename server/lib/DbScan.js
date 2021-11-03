"use strict";
/**
	Useage:
		const scanner = new DbScan();
		scanner.setEps(2);
		scanner.minPts(4);
		scanner.setDistance("Manhattan");
		scanner.setData(...);
		const results = scanner.run();
 */

class DbScan
{
	constructor()
	{
		this.eps = 2;
		this.minPoints = 4;
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
		this.minPoints = p;
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
		this.results = new Uint16Array(this.data.length).fill(0xffff);
		this.clusters = [];

		let neighbours;

		for(let i = 0; i < this.data.length; i++) {
			if(this.results[i] !== 0xffff) {
				continue;
			}

			this.results[i] = 0;						// Visited and marked as noise by default
			neighbours = this.getRegionNeighbours(i);

			if(neighbours.length >= this.minPoints) {
				this.clusters.push([]);					// Empty new cluster
				this.expand(i, neighbours, this.clusters.length);
			}
		}

		return this.results;
	}

	expand(pointId, neighbours, clusterId)
	{
		this.clusters[clusterId - 1].push(pointId);		// Add point to cluster
		this.results[pointId] = clusterId;				// Assign cluster id

		let currNeighbours, currPointId;

		for(let i = 0; i < neighbours.length; i++) {
			currPointId = neighbours[i];

			if(this.results[currPointId] === 0xffff) {
				this.results[currPointId] = 0;			// Visited and marked as noise by default
				currNeighbours = this.getRegionNeighbours(currPointId);

				if(currNeighbours.length >= this.minPoints) {
					this.expand(currPointId, currNeighbours, clusterId);
				}
			}

			if(this.results[currPointId] < 1) {
				// Not assigned to a cluster but visited (= 0)
				this.results[currPointId] = clusterId;
				this.clusters[clusterId - 1].push(currPointId);
			}
		}
	}

	getRegionNeighbours(pointId)
	{
		const neighbours = [];
		const point = this.data[pointId];
		let i = 0;

		// This is a _very_ hot code path.
		for(; i < this.data.length; i++) {
			if(pointId === i) {
				continue;
			}

			// The pre-check before calling distance() will actually cut
			// execution time down to 50% (and more in quiet scenarios). It
			// also seems to make execution time a little more predictable.
			// The downside is that it makes epsilon mean something else.
			if(Math.abs(this.data[i].x - point.x) < this.eps /*&& Math.abs(this.data[i].y - d.y) < this.eps*/
				&& this.distance(this.data[i], point) <= this.eps) {
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
