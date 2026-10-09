import { Vec3 } from 'playcanvas';
import { createMatrix, invertMatrix, transformPoint } from './MatrixUtils.js';

const _inverse = /* @__PURE__ */ createMatrix();
const _point = /* @__PURE__ */ new Vec3();

/**
 * A 64-bit view frustum described by six inward-facing planes and its eight corner points, used
 * for the two-way separating-plane test against oriented boxes.
 */
export class CameraFrustum {

	constructor() {

		/**
		 * Six planes stored as `nx, ny, nz, d`, normalized and facing into the frustum, so a point
		 * is inside when `n . p + d >= 0` for every plane.
		 * @type {Float64Array}
		 */
		this.planes = new Float64Array( 24 );

		/**
		 * Eight corner points stored as `x, y, z`.
		 * @type {Float64Array}
		 */
		this.points = new Float64Array( 24 );

	}

	/**
	 * Sets the frustum from a matrix that maps into clip space, using the same (OpenGL style,
	 * depth -1 to 1) convention as PlayCanvas camera projection matrices.
	 * @param {Array<number>|TypedArray} m
	 * @returns {CameraFrustum}
	 */
	setFromMatrix( m ) {

		const { planes, points } = this;

		// right, left, bottom, top, far, near - the same order as Frustum.setFromMat4 in PlayCanvas
		setPlane( planes, 0, m[ 3 ] - m[ 0 ], m[ 7 ] - m[ 4 ], m[ 11 ] - m[ 8 ], m[ 15 ] - m[ 12 ] );
		setPlane( planes, 1, m[ 3 ] + m[ 0 ], m[ 7 ] + m[ 4 ], m[ 11 ] + m[ 8 ], m[ 15 ] + m[ 12 ] );
		setPlane( planes, 2, m[ 3 ] + m[ 1 ], m[ 7 ] + m[ 5 ], m[ 11 ] + m[ 9 ], m[ 15 ] + m[ 13 ] );
		setPlane( planes, 3, m[ 3 ] - m[ 1 ], m[ 7 ] - m[ 5 ], m[ 11 ] - m[ 9 ], m[ 15 ] - m[ 13 ] );
		setPlane( planes, 4, m[ 3 ] - m[ 2 ], m[ 7 ] - m[ 6 ], m[ 11 ] - m[ 10 ], m[ 15 ] - m[ 14 ] );
		setPlane( planes, 5, m[ 3 ] + m[ 2 ], m[ 7 ] + m[ 6 ], m[ 11 ] + m[ 10 ], m[ 15 ] + m[ 14 ] );

		// the corners are the clip space cube corners mapped back through the inverse matrix
		invertMatrix( m, _inverse );
		let index = 0;
		for ( let x = - 1; x <= 1; x += 2 ) {

			for ( let y = - 1; y <= 1; y += 2 ) {

				for ( let z = - 1; z <= 1; z += 2 ) {

					transformPoint( _inverse, x, y, z, _point );
					points[ index ++ ] = _point.x;
					points[ index ++ ] = _point.y;
					points[ index ++ ] = _point.z;

				}

			}

		}

		return this;

	}

	/**
	 * @param {Vec3} center
	 * @param {number} radius
	 * @returns {boolean}
	 */
	intersectsSphere( center, radius ) {

		const planes = this.planes;
		for ( let i = 0; i < 24; i += 4 ) {

			const distance = planes[ i ] * center.x + planes[ i + 1 ] * center.y + planes[ i + 2 ] * center.z + planes[ i + 3 ];
			if ( distance < - radius ) {

				return false;

			}

		}

		return true;

	}

}

function setPlane( planes, index, x, y, z, d ) {

	const invLength = 1 / Math.hypot( x, y, z );
	const offset = index * 4;
	planes[ offset ] = x * invLength;
	planes[ offset + 1 ] = y * invLength;
	planes[ offset + 2 ] = z * invLength;
	planes[ offset + 3 ] = d * invLength;

}
