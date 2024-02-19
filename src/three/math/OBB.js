import { Matrix4, Box3, Vector3, Plane } from 'three';

const _normal1 = new Vector3();
const _normal2 = new Vector3();
const _normal3 = new Vector3();
const _vec3 = new Vector3();

export class OBB {

	constructor( box = new Box3(), transform = new Matrix4() ) {

		this.box = box.clone();
		this.transform = transform.clone();
		this.inverseTransform = new Matrix4();
		this.points = new Array( 8 ).fill().map( () => new Vector3() );
		this.planes = new Array( 6 ).fill().map( () => new Plane() );
		this.planeNeedsUpdate = false;

	}

	update() {

		const { points, inverseTransform, transform, box } = this;
		inverseTransform.copy( transform ).invert();

		const { min, max } = box;
		points[ 0 ].set( min.x, min.y, min.z ).applyMatrix4( transform ); // Front-bottom-left
		points[ 1 ].set( max.x, min.y, min.z ).applyMatrix4( transform ); // Front-bottom-right
		points[ 2 ].set( max.x, max.y, min.z ).applyMatrix4( transform ); // Front-top-right
		points[ 3 ].set( min.x, max.y, min.z ).applyMatrix4( transform ); // Front-top-left

		points[ 4 ].set( min.x, min.y, max.z ).applyMatrix4( transform ); // Back-bottom-left
		points[ 5 ].set( max.x, min.y, max.z ).applyMatrix4( transform ); // Back-bottom-right
		points[ 6 ].set( max.x, max.y, max.z ).applyMatrix4( transform ); // Back-top-right
		points[ 7 ].set( min.x, max.y, max.z ).applyMatrix4( transform ); // Back-top-left
		this.planeNeedsUpdate = true;

	}

	updatePlanes() {

		if ( ! this.planeNeedsUpdate ) return;

		const normals = [
			_normal1.subVectors( this.points[ 1 ], this.points[ 0 ] ).cross( _vec3.subVectors( this.points[ 2 ], this.points[ 0 ] ) ).normalize(),
			_normal2.subVectors( this.points[ 0 ], this.points[ 3 ] ).cross( _vec3.subVectors( this.points[ 4 ], this.points[ 0 ] ) ).normalize(),
			_normal3.subVectors( this.points[ 2 ], this.points[ 3 ] ).cross( _vec3.subVectors( this.points[ 6 ], this.points[ 2 ] ) ).normalize(),
		];

		// Front and back
		this.planes[ 0 ].setFromNormalAndCoplanarPoint( normals[ 0 ], this.points[ 0 ] );
		this.planes[ 1 ].setFromNormalAndCoplanarPoint( normals[ 0 ].negate(), this.points[ 6 ] );

		// Left and right
		this.planes[ 2 ].setFromNormalAndCoplanarPoint( normals[ 1 ], this.points[ 1 ] );
		this.planes[ 3 ].setFromNormalAndCoplanarPoint( normals[ 1 ].negate(), this.points[ 3 ] );

		// Top and bottom
		this.planes[ 4 ].setFromNormalAndCoplanarPoint( normals[ 2 ], this.points[ 3 ] );
		this.planes[ 5 ].setFromNormalAndCoplanarPoint( normals[ 2 ].negate(), this.points[ 4 ] );

		this.planeNeedsUpdate = false;

	}

	// based on three.js' Box3 "intersects frustum" function
	intersectsFrustum( frustum ) {

		const { points } = this;
		const { planes } = frustum;
		for ( let i = 0; i < 6; i ++ ) {

			const plane = planes[ i ];
			let maxDistance = - Infinity;
			for ( let j = 0; j < 8; j ++ ) {

				const v = points[ j ];
				const dist = plane.distanceToPoint( v );
				maxDistance = maxDistance < dist ? dist : maxDistance;

			}

			if ( maxDistance < 0 ) {

				return false;

			}

		}

		// do the opposite check using the obb planes to avoid false positives
		this.updatePlanes();
		for ( let i = 0; i < 6; i ++ ) {

			const plane = this.planes[ i ];
			let maxDistance = - Infinity;
			for ( let j = 0; j < 8; j ++ ) {

				const v = frustum.mPoints[ j ];
				const dist = plane.distanceToPoint( v );
				maxDistance = maxDistance < dist ? dist : maxDistance;

			}

			if ( maxDistance < 0 ) {

				return false;

			}

		}

		return true;

	}

}
