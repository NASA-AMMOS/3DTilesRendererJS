import { Matrix4, Box3, Vector3 } from 'three';

export class OBB {

	constructor( box = new Box3(), transform = new Matrix4() ) {

		this.box = box.clone();
		this.transform = transform.clone();
		this.inverseTransform = new Matrix4();
		this.points = new Array( 8 ).fill().map( () => new Vector3() );

	}

	update() {

		const { points, inverseTransform, transform, box } = this;
		inverseTransform.copy( transform ).invert();

		const { min, max } = box;
		let index = 0;
		for ( let x = - 1; x <= 1; x += 2 ) {

			for ( let y = - 1; y <= 1; y += 2 ) {

				for ( let z = - 1; z <= 1; z += 2 ) {

					points[ index ].set(
						x < 0 ? min.x : max.x,
						y < 0 ? min.y : max.y,
						z < 0 ? min.z : max.z,
					).applyMatrix4( transform );
					index ++;

				}

			}

		}

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

		return true;

	}

}
