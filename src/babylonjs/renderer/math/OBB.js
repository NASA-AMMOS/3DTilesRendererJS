import { Vector3, BoundingBox, Matrix } from '@babylonjs/core';

// Scratch vectors for precision-safe distance calculation
const _toPoint = /* @__PURE__ */ new Vector3();
const _closestOnBox = /* @__PURE__ */ new Vector3();
const _axisX = /* @__PURE__ */ new Vector3();
const _axisY = /* @__PURE__ */ new Vector3();
const _axisZ = /* @__PURE__ */ new Vector3();
const _tempVec = /* @__PURE__ */ new Vector3();

/**
 * Oriented Bounding Box with precision-safe distance calculation.
 * Stores OBB data directly rather than relying on Babylon's BoundingBox,
 * which stores AABB extents rather than OBB extents.
 */
export class OBB {

	constructor() {

		// Store OBB properties directly for correct calculations
		this.center = new Vector3();
		this.halfExtents = new Vector3( 1, 1, 1 );
		this.axes = [
			new Vector3( 1, 0, 0 ),
			new Vector3( 0, 1, 0 ),
			new Vector3( 0, 0, 1 ),
		];
		// Corner points for frustum checks
		this._points = new Array( 8 ).fill( null ).map( () => new Vector3() );

	}

	/**
	 * Initialize the OBB with min/max bounds and a world transform matrix
	 * @param {Vector3} min - Minimum corner in local space
	 * @param {Vector3} max - Maximum corner in local space
	 * @param {Matrix} worldMatrix - Transform from local to world space
	 */
	setFromMinMax( min, max, worldMatrix ) {

		// Compute local center and half-extents
		const localCenterX = ( min.x + max.x ) * 0.5;
		const localCenterY = ( min.y + max.y ) * 0.5;
		const localCenterZ = ( min.z + max.z ) * 0.5;

		this.halfExtents.set(
			( max.x - min.x ) * 0.5,
			( max.y - min.y ) * 0.5,
			( max.z - min.z ) * 0.5
		);

		// Transform center to world space
		_tempVec.set( localCenterX, localCenterY, localCenterZ );
		Vector3.TransformCoordinatesToRef( _tempVec, worldMatrix, this.center );

		// Extract axes from the matrix (columns 0, 1, 2)
		const m = worldMatrix.m;
		this.axes[ 0 ].set( m[ 0 ], m[ 1 ], m[ 2 ] );
		this.axes[ 1 ].set( m[ 4 ], m[ 5 ], m[ 6 ] );
		this.axes[ 2 ].set( m[ 8 ], m[ 9 ], m[ 10 ] );

		// Compute the 8 corner points in world space for frustum checks
		this._updateCornerPoints();

	}

	/**
	 * Update the 8 corner points based on center, halfExtents, and axes
	 */
	_updateCornerPoints() {

		const { center, halfExtents, axes, _points } = this;

		let index = 0;
		for ( let x = - 1; x <= 1; x += 2 ) {

			for ( let y = - 1; y <= 1; y += 2 ) {

				for ( let z = - 1; z <= 1; z += 2 ) {

					_points[ index ]
						.copyFrom( center )
						.addInPlace( axes[ 0 ].scale( x * halfExtents.x ) )
						.addInPlace( axes[ 1 ].scale( y * halfExtents.y ) )
						.addInPlace( axes[ 2 ].scale( z * halfExtents.z ) );
					index ++;

				}

			}

		}

	}

	/**
	 * Get the 8 corner points in world space
	 * @returns {Vector3[]}
	 */
	get points() {

		return this._points;

	}

	/**
	 * Precision-safe distance calculation from a point to this OBB.
	 * Uses axis projections instead of matrix transforms to avoid floating-point
	 * precision loss with large ECEF coordinates.
	 * @param {Vector3} point - The point to measure distance from
	 * @returns {number} Distance from point to closest point on OBB surface (0 if inside)
	 */
	distanceToPoint( point ) {

		const { center, halfExtents, axes } = this;

		// Compute vector from OBB center to the point
		// This subtraction keeps values small even with large ECEF coordinates
		_toPoint.copyFrom( point ).subtractInPlace( center );

		// Normalize axes for projection (they may have scale baked in)
		const len0 = axes[ 0 ].length();
		const len1 = axes[ 1 ].length();
		const len2 = axes[ 2 ].length();

		_axisX.copyFrom( axes[ 0 ] );
		_axisY.copyFrom( axes[ 1 ] );
		_axisZ.copyFrom( axes[ 2 ] );
		if ( len0 > 0 ) _axisX.scaleInPlace( 1 / len0 );
		if ( len1 > 0 ) _axisY.scaleInPlace( 1 / len1 );
		if ( len2 > 0 ) _axisZ.scaleInPlace( 1 / len2 );

		// Project point-to-center vector onto each axis
		let projX = Vector3.Dot( _toPoint, _axisX );
		let projY = Vector3.Dot( _toPoint, _axisY );
		let projZ = Vector3.Dot( _toPoint, _axisZ );

		// Half-extents scaled by axis lengths
		const extentX = halfExtents.x * len0;
		const extentY = halfExtents.y * len1;
		const extentZ = halfExtents.z * len2;

		// Clamp projections to box extents
		projX = Math.max( - extentX, Math.min( extentX, projX ) );
		projY = Math.max( - extentY, Math.min( extentY, projY ) );
		projZ = Math.max( - extentZ, Math.min( extentZ, projZ ) );

		// Build closest point on box surface (relative to center)
		_closestOnBox.copyFrom( _axisX ).scaleInPlace( projX );
		_tempVec.copyFrom( _axisY ).scaleInPlace( projY );
		_closestOnBox.addInPlace( _tempVec );
		_tempVec.copyFrom( _axisZ ).scaleInPlace( projZ );
		_closestOnBox.addInPlace( _tempVec );

		// Distance is from closest point to the original toPoint vector
		return Vector3.Distance( _closestOnBox, _toPoint );

	}

	/**
	 * Check if this OBB intersects the given frustum planes
	 * @param {Plane[]} frustumPlanes - Array of 6 frustum planes
	 * @returns {boolean}
	 */
	intersectsFrustum( frustumPlanes ) {

		// Use Babylon's built-in frustum check with world-space corner points
		return BoundingBox.IsInFrustum( this._points, frustumPlanes );

	}

}
