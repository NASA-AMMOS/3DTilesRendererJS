import { Vector3, BoundingInfo, Matrix } from '@babylonjs/core';

const _min = /* @__PURE__ */ new Vector3();
const _max = /* @__PURE__ */ new Vector3();

/**
 * Oriented Bounding Box using Babylon.js BoundingInfo.
 * With useLargeWorldRendering enabled, Babylon uses double precision
 * internally for all coordinate calculations.
 */
export class OBB {

	constructor() {

		// BoundingInfo provides both bounding box and bounding sphere
		this.boundingInfo = null;

		// Store the world matrix for distance calculations
		this._worldMatrix = Matrix.Identity();
		this._worldMatrixInverse = Matrix.Identity();

	}

	/**
	 * Initialize the OBB with min/max bounds and a world transform matrix
	 * @param {Vector3} min - Minimum corner in local space
	 * @param {Vector3} max - Maximum corner in local space
	 * @param {Matrix} worldMatrix - Transform from local to world space
	 */
	setFromMinMax( min, max, worldMatrix ) {

		// Store the world matrix
		this._worldMatrix.copyFrom( worldMatrix );
		worldMatrix.invertToRef( this._worldMatrixInverse );

		// Create BoundingInfo with the world matrix - Babylon handles the transform
		this.boundingInfo = new BoundingInfo( min, max, worldMatrix );

	}

	/**
	 * Get the center of the OBB in world space
	 * @returns {Vector3}
	 */
	get center() {

		if ( ! this.boundingInfo ) return Vector3.Zero();
		return this.boundingInfo.boundingBox.centerWorld;

	}

	/**
	 * Get the 8 corner points in world space
	 * @returns {Vector3[]}
	 */
	get points() {

		if ( ! this.boundingInfo ) return [];
		return this.boundingInfo.boundingBox.vectorsWorld;

	}

	/**
	 * Calculate distance from a point to this OBB.
	 * Uses Babylon's internal calculations which respect large world mode.
	 * @param {Vector3} point - The point to measure distance from
	 * @returns {number} Distance from point to closest point on OBB surface (0 if inside)
	 */
	distanceToPoint( point ) {

		if ( ! this.boundingInfo ) return Infinity;

		const bb = this.boundingInfo.boundingBox;

		// Transform point to local space of the OBB
		Vector3.TransformCoordinatesToRef( point, this._worldMatrixInverse, _min );

		// In local space, the box is axis-aligned from bb.minimum to bb.maximum
		const localMin = bb.minimum;
		const localMax = bb.maximum;

		// Clamp point to box in local space
		_max.set(
			Math.max( localMin.x, Math.min( localMax.x, _min.x ) ),
			Math.max( localMin.y, Math.min( localMax.y, _min.y ) ),
			Math.max( localMin.z, Math.min( localMax.z, _min.z ) )
		);

		// Distance in local space
		const localDist = Vector3.Distance( _min, _max );

		// For OBB, we need to account for any scale in the world matrix
		// Get the average scale factor
		const m = this._worldMatrix.m;
		const scaleX = Math.sqrt( m[ 0 ] * m[ 0 ] + m[ 1 ] * m[ 1 ] + m[ 2 ] * m[ 2 ] );
		const scaleY = Math.sqrt( m[ 4 ] * m[ 4 ] + m[ 5 ] * m[ 5 ] + m[ 6 ] * m[ 6 ] );
		const scaleZ = Math.sqrt( m[ 8 ] * m[ 8 ] + m[ 9 ] * m[ 9 ] + m[ 10 ] * m[ 10 ] );
		const avgScale = ( scaleX + scaleY + scaleZ ) / 3;

		return localDist * avgScale;

	}

	/**
	 * Check if this OBB intersects the frustum.
	 * Uses Babylon's built-in frustum check which respects large world mode.
	 * @param {Plane[]} frustumPlanes - Array of 6 frustum planes
	 * @returns {boolean}
	 */
	intersectsFrustum( frustumPlanes ) {

		if ( ! this.boundingInfo ) return true;

		// Use Babylon's built-in frustum check
		// This respects useLargeWorldRendering and uses double precision
		return this.boundingInfo.isInFrustum( frustumPlanes );

	}

}
