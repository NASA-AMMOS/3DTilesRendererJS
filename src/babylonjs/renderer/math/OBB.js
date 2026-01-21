import { Vector3, Matrix, BoundingBox } from '@babylonjs/core';

const _vec = /* @__PURE__ */ new Vector3();
const _localPoint = /* @__PURE__ */ new Vector3();
const _closestOnBox = /* @__PURE__ */ new Vector3();
const _obbCenter = /* @__PURE__ */ new Vector3();
const _toPoint = /* @__PURE__ */ new Vector3();
const _axisX = /* @__PURE__ */ new Vector3();
const _axisY = /* @__PURE__ */ new Vector3();
const _axisZ = /* @__PURE__ */ new Vector3();

export class OBB {

	constructor() {

		this.min = new Vector3( - 1, - 1, - 1 );
		this.max = new Vector3( 1, 1, 1 );
		this.transform = Matrix.Identity();
		this.inverseTransform = Matrix.Identity();
		this.points = new Array( 8 ).fill( null ).map( () => new Vector3() );

		// Cached OBB axes and center for precision-safe distance calculation
		this.center = new Vector3();
		this.axisX = new Vector3();
		this.axisY = new Vector3();
		this.axisZ = new Vector3();
		this.halfSizeX = 1;
		this.halfSizeY = 1;
		this.halfSizeZ = 1;

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

		// Cache OBB center and axes for precision-safe distance calculation
		// Extract center (transform the local center point)
		const localCenterX = ( min.x + max.x ) * 0.5;
		const localCenterY = ( min.y + max.y ) * 0.5;
		const localCenterZ = ( min.z + max.z ) * 0.5;
		_vec.set( localCenterX, localCenterY, localCenterZ );
		Vector3.TransformCoordinatesToRef( _vec, transform, this.center );

		// Extract axes from the transform matrix (columns 0, 1, 2 are the axes)
		const m = transform.m;
		this.axisX.set( m[ 0 ], m[ 1 ], m[ 2 ] );
		this.axisY.set( m[ 4 ], m[ 5 ], m[ 6 ] );
		this.axisZ.set( m[ 8 ], m[ 9 ], m[ 10 ] );

		// Half-sizes are the extents in local space
		this.halfSizeX = ( max.x - min.x ) * 0.5;
		this.halfSizeY = ( max.y - min.y ) * 0.5;
		this.halfSizeZ = ( max.z - min.z ) * 0.5;

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

		// Use precision-safe calculation that avoids matrix transforms with large ECEF coordinates
		// This computes the closest point on the OBB using axis projections
		const { center, axisX, axisY, axisZ, halfSizeX, halfSizeY, halfSizeZ } = this;

		// Compute vector from OBB center to the point
		// This subtraction keeps values small even with large ECEF coordinates
		_toPoint.copyFrom( point ).subtractInPlace( center );

		// Project onto each axis and clamp to half-extents
		const axisXLen = axisX.length();
		const axisYLen = axisY.length();
		const axisZLen = axisZ.length();

		// Get normalized axes
		_axisX.copyFrom( axisX );
		_axisY.copyFrom( axisY );
		_axisZ.copyFrom( axisZ );
		if ( axisXLen > 0 ) _axisX.scaleInPlace( 1 / axisXLen );
		if ( axisYLen > 0 ) _axisY.scaleInPlace( 1 / axisYLen );
		if ( axisZLen > 0 ) _axisZ.scaleInPlace( 1 / axisZLen );

		// Project point-to-center vector onto each axis
		let projX = Vector3.Dot( _toPoint, _axisX );
		let projY = Vector3.Dot( _toPoint, _axisY );
		let projZ = Vector3.Dot( _toPoint, _axisZ );

		// Scale half-sizes by axis lengths (axes may not be unit length)
		const extentX = halfSizeX * axisXLen;
		const extentY = halfSizeY * axisYLen;
		const extentZ = halfSizeZ * axisZLen;

		// Clamp projections to box extents
		projX = Math.max( - extentX, Math.min( extentX, projX ) );
		projY = Math.max( - extentY, Math.min( extentY, projY ) );
		projZ = Math.max( - extentZ, Math.min( extentZ, projZ ) );

		// Build closest point on box surface (relative to center)
		_closestOnBox.copyFrom( _axisX ).scaleInPlace( projX );
		_closestOnBox.addInPlace( _axisY.scale( projY ) );
		_closestOnBox.addInPlace( _axisZ.scale( projZ ) );

		// Distance is from closest point to the original toPoint vector
		return Vector3.Distance( _closestOnBox, _toPoint );

	}

	intersectsFrustum( frustumPlanes ) {

		// TODO: implement a more robust OBB / Frustum check. This one includes false positives.
		return BoundingBox.IsInFrustum( this.points, frustumPlanes );

	}

}
