import { Vector3, Matrix, BoundingBox } from '@babylonjs/core';

const _vec = /* @__PURE__ */ new Vector3();
export class OBB {

	constructor() {

		this.min = new Vector3( - 1, - 1, - 1 );
		this.max = new Vector3( 1, 1, 1 );
		this.transform = Matrix.Identity();
		this.inverseTransform = Matrix.Identity();
		this.points = new Array( 8 ).fill( null ).map( () => new Vector3() );

	}

	update() {

		const { min, max, points, transform } = this;
		transform.invertToRef( this.inverseTransform );

		// update corner points
		let index = 0;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					points[ index ].set(
						x === 0 ? min.x : max.x,
						y === 0 ? min.y : max.y,
						z === 0 ? min.z : max.z,
					);
					Vector3.TransformCoordinatesToRef(
						points[ index ],
						transform,
						points[ index ],
					);
					index ++;

				}

			}

		}

	}

	clampPoint( point, result ) {

		const { min, max, transform, inverseTransform } = this;

		Vector3.TransformCoordinatesToRef( point, inverseTransform, result );
		result.x = Math.max( min.x, Math.min( max.x, result.x ) );
		result.y = Math.max( min.y, Math.min( max.y, result.y ) );
		result.z = Math.max( min.z, Math.min( max.z, result.z ) );

		// transform back to world space
		Vector3.TransformCoordinatesToRef( result, transform, result );

		return result;

	}

	distanceToPoint( point ) {

		this.clampPoint( point, _vec );
		return Vector3.Distance( _vec, point );

	}

	intersectsFrustum( frustumPlanes ) {

		// TODO: implement a more robust OBB / Frustum check. This one includes false positives.
		return BoundingBox.IsInFrustum( this.points, frustumPlanes );

	}

}
