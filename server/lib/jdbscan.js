const jDBSCAN = function() {
	// Local instance vars.
	let eps;
	let minPts;
	let data = [];
	let clusters = [];
	let status = [];
	let distance = euclidean_distance;

	// Distance Functions
	function euclidean_distance(point1, point2) {
		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	}

	function manhattan_distance(point1, point2) {
		return Math.abs(point2.x - point1.x) + Math.abs(point2.y - point1.y);
	}

	// Core Algorithm Related
	function get_region_neighbours(point_idx)
	{
		const neighbours = [];
		let d = data[point_idx];
		let i = 0;
		let dlen = data.length;

		for (; i < dlen; i++) {
			if (point_idx === i) {
				continue;
			}

//			if (distance(data[i], d) <= eps) {
//				neighbours.push(i);
//			}
			// The pre-check before calling distance here will actually cut execution time down to 50%.
			// It also seems to make execution time a little more predictable.
			// The downside is that it makes epsilon mean something else now.
			if(Math.abs(data[i].x - d.x) < eps
				&& Math.abs(data[i].y - d.y) < eps
				&& distance(data[i], d) <= eps) {
				neighbours.push(i);
			}

		}

		return neighbours;
	}

	function expand_cluster(point_idx, neighbours, cluster_idx)
	{
		clusters[cluster_idx - 1].push(point_idx); // add point to cluster
		status[point_idx] = cluster_idx; // assign cluster id

		let curr_neighbours, curr_num_neighbours, curr_point_idx;

		for (let i = 0; i < neighbours.length; i++) {
			curr_point_idx = neighbours[i];

			if (status[curr_point_idx] === 0xffff) {
				status[curr_point_idx] = 0; // visited and marked as noise by default
				curr_neighbours = get_region_neighbours(curr_point_idx);
				curr_num_neighbours = curr_neighbours.length;

				if (curr_num_neighbours >= minPts) {
					expand_cluster(curr_point_idx, curr_neighbours, cluster_idx);
				}
			}

			if (status[curr_point_idx] < 1) {
				// not assigned to a cluster but visited (= 0)
				status[curr_point_idx] = cluster_idx;
				clusters[cluster_idx - 1].push(curr_point_idx);
			}
		}
	}

	let dbscan = function() {
		status = new Uint16Array(data.length).fill(0xffff);//[];
		clusters = [];

		let neighbours, num_neighbours, cluster_idx;

		for (let i = 0; i < data.length; i++) {
			if (status[i] === 0xffff) {
				status[i] = 0; // visited and marked as noise by default
				neighbours = get_region_neighbours(i);
				num_neighbours = neighbours.length;

				if (num_neighbours < minPts) {
					status[i] = 0; // noise
				} else {
					clusters.push([]); // empty new cluster
					cluster_idx = clusters.length;
					expand_cluster(i, neighbours, cluster_idx);
				}
			}
		}

		return status;
	};

	// Resulting Clusters Center Points
	dbscan.getClusters = function() {
		const num_clusters = clusters.length;
		const clusters_centers = [];

		let clen;
		for (let i = 0; i < num_clusters; i++) {
			clusters_centers[i] = { x: 0, y: 0 };

			clen = clusters[i].length;
			for (let j = 0; j < clen; j++) {
				clusters_centers[i].x += data[clusters[i][j]].x;
				clusters_centers[i].y += data[clusters[i][j]].y;
			}

			clusters_centers[i].x /= clen;
			clusters_centers[i].y /= clen;
			clusters_centers[i].dimension = clen;
			clusters_centers[i].parts = clusters[i];
		}

		return clusters_centers;
	};

	// Getters and setters
	dbscan.data = function(d) {
		if (arguments.length === 0) {
			return data;
		}

		if (Array.isArray(d)) {
			data = d;
		}

		return dbscan;
	};

	dbscan.eps = function(e) {
		if (arguments.length === 0) {
			return eps;
		}

		if (typeof e === 'number') {
			eps = e;
		}

		return dbscan;
	};
	dbscan.minPts = function(p) {
		if (arguments.length === 0) {
			return minPts;
		}

		if (typeof p === 'number') {
			minPts = p;
		}

		return dbscan;
	};

	dbscan.distance = function(fn) {
		if (arguments.length === 1) {
			if (typeof fn === 'string') {
				switch (fn) {
					case 'EUCLIDEAN':
						distance = euclidean_distance;
						break;
					case 'MANHATTAN':
						distance = manhattan_distance;
						break;
					default:
						distance = euclidean_distance;
				}
			} else if (typeof fn === 'function') {
				distance = fn;
			}
		}

		return dbscan;
	};
	return dbscan;
};

module.exports = jDBSCAN;
