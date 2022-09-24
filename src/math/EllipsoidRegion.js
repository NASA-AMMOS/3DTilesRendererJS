import { Ellipsoid } from '../math/Ellipsoid.js';

const PI = Math.PI;
const HALF_PI = PI / 2;
export class EllipsoidRegion extends Ellipsoid {

	constructor(
		x, y, z,
		latStart = - HALF_PI, latEnd = HALF_PI,
		lonStart = 0, lonEnd = 2 * PI,
		heightStart = 0, heightEnd = 0
	) {

		super( x, y, z );
		this.latStart = latStart;
		this.latEnd = latEnd;
		this.lonStart = lonStart;
		this.lonEnd = lonEnd;
		this.heightStart = heightStart;
		this.heightEnd = heightEnd;

	}

	getBoundingBox( box, matrix ) {

		// TODO

	}

	getBoundingSphere( sphere ) {

		// TODO

	}

}
