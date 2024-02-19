import { Frustum, Matrix3, Vector3 } from 'three';

const _mat3 = new Matrix3();

function findIntersectionPoint( plane1, plane2, plane3, target ) {

	// Create the matrix A using the normals of the planes
	const A = _mat3.set(
		plane1.normal.x, plane1.normal.y, plane1.normal.z,
		plane2.normal.x, plane2.normal.y, plane2.normal.z,
		plane3.normal.x, plane3.normal.y, plane3.normal.z
	);

	// Create the vector B using the constants of the planes
	target.set( - plane1.constant, - plane2.constant, - plane3.constant );

	// Solve for X by applying the inverse matrix to B
	target.applyMatrix3( A.invert() );

	return target;

}

class ExtendedFrustum extends Frustum {

	constructor() {

		super();
		this.points = Array( 8 ).fill().map( () => new Vector3() );

	}

	setFromProjectionMatrix( m, coordinateSystem ) {

		super.setFromProjectionMatrix( m, coordinateSystem );
		this.calculateFrustumPoints();

	}

	calculateFrustumPoints() {

		const planeIntersections = [
			[ this.planes[ 0 ], this.planes[ 3 ], this.planes[ 4 ] ], // Near top left
			[ this.planes[ 1 ], this.planes[ 3 ], this.planes[ 4 ] ], // Near top right
			[ this.planes[ 0 ], this.planes[ 2 ], this.planes[ 4 ] ], // Near bottom left
			[ this.planes[ 1 ], this.planes[ 2 ], this.planes[ 4 ] ], // Near bottom right
			[ this.planes[ 0 ], this.planes[ 3 ], this.planes[ 5 ] ], // Far top left
			[ this.planes[ 1 ], this.planes[ 3 ], this.planes[ 5 ] ], // Far top right
			[ this.planes[ 0 ], this.planes[ 2 ], this.planes[ 5 ] ], // Far bottom left
			[ this.planes[ 1 ], this.planes[ 2 ], this.planes[ 5 ] ] // Far bottom right
		];

		planeIntersections.forEach( ( planes, index ) => {

			findIntersectionPoint( planes[ 0 ], planes[ 1 ], planes[ 2 ], this.points[ index ] );

		} );

	}

}

export { ExtendedFrustum };
