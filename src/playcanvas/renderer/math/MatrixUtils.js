/** @import { Quat, Vec3 } from 'playcanvas' */
import { Mat4 } from 'playcanvas';

// PlayCanvas matrices store their elements in a Float32Array, which cannot represent geospatial
// coordinates precisely, so tile transforms are kept in column-major Float64Arrays (the same layout
// as 3D Tiles and PlayCanvas use) and only small, final results are written into engine objects.

const _temp = /* @__PURE__ */ new Float64Array( 16 );
const _rotation = /* @__PURE__ */ new Mat4();

/**
 * Creates a new 64-bit identity matrix.
 * @returns {Float64Array}
 */
export function createMatrix() {

	return setIdentity( new Float64Array( 16 ) );

}

/**
 * Sets the matrix to identity.
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function setIdentity( out ) {

	out.fill( 0 );
	out[ 0 ] = 1;
	out[ 5 ] = 1;
	out[ 10 ] = 1;
	out[ 15 ] = 1;
	return out;

}

/**
 * Copies 16 column-major elements from any array-like source.
 * @param {Array<number>|TypedArray} source
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function copyMatrix( source, out ) {

	for ( let i = 0; i < 16; i ++ ) {

		out[ i ] = source[ i ];

	}

	return out;

}

/**
 * Multiplies two matrices, `out = a * b`. The output may alias either input.
 * @param {Array<number>|TypedArray} a
 * @param {Array<number>|TypedArray} b
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function multiplyMatrices( a, b, out ) {

	for ( let col = 0; col < 4; col ++ ) {

		const b0 = b[ col * 4 ];
		const b1 = b[ col * 4 + 1 ];
		const b2 = b[ col * 4 + 2 ];
		const b3 = b[ col * 4 + 3 ];
		for ( let row = 0; row < 4; row ++ ) {

			_temp[ col * 4 + row ] = a[ row ] * b0 + a[ 4 + row ] * b1 + a[ 8 + row ] * b2 + a[ 12 + row ] * b3;

		}

	}

	return copyMatrix( _temp, out );

}

/**
 * Inverts a general 4x4 matrix. A singular matrix produces the identity. The output may alias the
 * input.
 * @param {Array<number>|TypedArray} m
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function invertMatrix( m, out ) {

	const a00 = m[ 0 ], a01 = m[ 1 ], a02 = m[ 2 ], a03 = m[ 3 ];
	const a10 = m[ 4 ], a11 = m[ 5 ], a12 = m[ 6 ], a13 = m[ 7 ];
	const a20 = m[ 8 ], a21 = m[ 9 ], a22 = m[ 10 ], a23 = m[ 11 ];
	const a30 = m[ 12 ], a31 = m[ 13 ], a32 = m[ 14 ], a33 = m[ 15 ];

	const b00 = a00 * a11 - a01 * a10;
	const b01 = a00 * a12 - a02 * a10;
	const b02 = a00 * a13 - a03 * a10;
	const b03 = a01 * a12 - a02 * a11;
	const b04 = a01 * a13 - a03 * a11;
	const b05 = a02 * a13 - a03 * a12;
	const b06 = a20 * a31 - a21 * a30;
	const b07 = a20 * a32 - a22 * a30;
	const b08 = a20 * a33 - a23 * a30;
	const b09 = a21 * a32 - a22 * a31;
	const b10 = a21 * a33 - a23 * a31;
	const b11 = a22 * a33 - a23 * a32;

	const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	if ( det === 0 ) {

		return setIdentity( out );

	}

	const invDet = 1 / det;
	out[ 0 ] = ( a11 * b11 - a12 * b10 + a13 * b09 ) * invDet;
	out[ 1 ] = ( - a01 * b11 + a02 * b10 - a03 * b09 ) * invDet;
	out[ 2 ] = ( a31 * b05 - a32 * b04 + a33 * b03 ) * invDet;
	out[ 3 ] = ( - a21 * b05 + a22 * b04 - a23 * b03 ) * invDet;
	out[ 4 ] = ( - a10 * b11 + a12 * b08 - a13 * b07 ) * invDet;
	out[ 5 ] = ( a00 * b11 - a02 * b08 + a03 * b07 ) * invDet;
	out[ 6 ] = ( - a30 * b05 + a32 * b02 - a33 * b01 ) * invDet;
	out[ 7 ] = ( a20 * b05 - a22 * b02 + a23 * b01 ) * invDet;
	out[ 8 ] = ( a10 * b10 - a11 * b08 + a13 * b06 ) * invDet;
	out[ 9 ] = ( - a00 * b10 + a01 * b08 - a03 * b06 ) * invDet;
	out[ 10 ] = ( a30 * b04 - a31 * b02 + a33 * b00 ) * invDet;
	out[ 11 ] = ( - a20 * b04 + a21 * b02 - a23 * b00 ) * invDet;
	out[ 12 ] = ( - a10 * b09 + a11 * b07 - a12 * b06 ) * invDet;
	out[ 13 ] = ( a00 * b09 - a01 * b07 + a02 * b06 ) * invDet;
	out[ 14 ] = ( - a30 * b03 + a31 * b01 - a32 * b00 ) * invDet;
	out[ 15 ] = ( a20 * b03 - a21 * b01 + a22 * b00 ) * invDet;
	return out;

}

/**
 * Transforms a point by the matrix, including the perspective divide.
 * @param {Array<number>|TypedArray} m
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {Vec3} out
 * @returns {Vec3}
 */
export function transformPoint( m, x, y, z, out ) {

	const w = m[ 3 ] * x + m[ 7 ] * y + m[ 11 ] * z + m[ 15 ];
	const invW = w === 0 ? 1 : 1 / w;
	out.x = ( m[ 0 ] * x + m[ 4 ] * y + m[ 8 ] * z + m[ 12 ] ) * invW;
	out.y = ( m[ 1 ] * x + m[ 5 ] * y + m[ 9 ] * z + m[ 13 ] ) * invW;
	out.z = ( m[ 2 ] * x + m[ 6 ] * y + m[ 10 ] * z + m[ 14 ] ) * invW;
	return out;

}

/**
 * Transforms a direction by the upper 3x3 of the matrix and normalizes it.
 * @param {Array<number>|TypedArray} m
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {Vec3} out
 * @returns {Vec3}
 */
export function transformDirection( m, x, y, z, out ) {

	out.x = m[ 0 ] * x + m[ 4 ] * y + m[ 8 ] * z;
	out.y = m[ 1 ] * x + m[ 5 ] * y + m[ 9 ] * z;
	out.z = m[ 2 ] * x + m[ 6 ] * y + m[ 10 ] * z;
	return out.normalize();

}

/**
 * Returns the largest scale factor along any of the matrix axes.
 * @param {Array<number>|TypedArray} m
 * @returns {number}
 */
export function getMaxScale( m ) {

	const sx = m[ 0 ] * m[ 0 ] + m[ 1 ] * m[ 1 ] + m[ 2 ] * m[ 2 ];
	const sy = m[ 4 ] * m[ 4 ] + m[ 5 ] * m[ 5 ] + m[ 6 ] * m[ 6 ];
	const sz = m[ 8 ] * m[ 8 ] + m[ 9 ] * m[ 9 ] + m[ 10 ] * m[ 10 ];
	return Math.sqrt( Math.max( sx, sy, sz ) );

}

/**
 * Sets the matrix to a rotation around the X axis.
 * @param {number} angle - Angle in radians.
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function makeRotationX( angle, out ) {

	const c = Math.cos( angle );
	const s = Math.sin( angle );
	setIdentity( out );
	out[ 5 ] = c;
	out[ 6 ] = s;
	out[ 9 ] = - s;
	out[ 10 ] = c;
	return out;

}

/**
 * Sets the matrix to a rotation around the Y axis.
 * @param {number} angle - Angle in radians.
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function makeRotationY( angle, out ) {

	const c = Math.cos( angle );
	const s = Math.sin( angle );
	setIdentity( out );
	out[ 0 ] = c;
	out[ 2 ] = - s;
	out[ 8 ] = s;
	out[ 10 ] = c;
	return out;

}

/**
 * Sets the matrix to a translation.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {Float64Array} out
 * @returns {Float64Array}
 */
export function makeTranslation( x, y, z, out ) {

	setIdentity( out );
	out[ 12 ] = x;
	out[ 13 ] = y;
	out[ 14 ] = z;
	return out;

}

/**
 * Decomposes an affine matrix into translation, rotation and scale. Translation and scale are
 * computed in 64-bit; only the normalized rotation basis passes through a 32-bit matrix.
 * @param {Array<number>|TypedArray} m
 * @param {Vec3} position
 * @param {Quat} rotation
 * @param {Vec3} scale
 */
export function decomposeMatrix( m, position, rotation, scale ) {

	let sx = Math.hypot( m[ 0 ], m[ 1 ], m[ 2 ] );
	const sy = Math.hypot( m[ 4 ], m[ 5 ], m[ 6 ] );
	const sz = Math.hypot( m[ 8 ], m[ 9 ], m[ 10 ] );

	// a negative determinant means the basis is mirrored, which is folded into the x scale
	const det =
		m[ 0 ] * ( m[ 5 ] * m[ 10 ] - m[ 6 ] * m[ 9 ] ) -
		m[ 4 ] * ( m[ 1 ] * m[ 10 ] - m[ 2 ] * m[ 9 ] ) +
		m[ 8 ] * ( m[ 1 ] * m[ 6 ] - m[ 2 ] * m[ 5 ] );
	if ( det < 0 ) {

		sx = - sx;

	}

	position.set( m[ 12 ], m[ 13 ], m[ 14 ] );
	scale.set( sx, sy, sz );

	const invX = sx === 0 ? 0 : 1 / sx;
	const invY = sy === 0 ? 0 : 1 / sy;
	const invZ = sz === 0 ? 0 : 1 / sz;
	const r = _rotation.data;
	r[ 0 ] = m[ 0 ] * invX;
	r[ 1 ] = m[ 1 ] * invX;
	r[ 2 ] = m[ 2 ] * invX;
	r[ 3 ] = 0;
	r[ 4 ] = m[ 4 ] * invY;
	r[ 5 ] = m[ 5 ] * invY;
	r[ 6 ] = m[ 6 ] * invY;
	r[ 7 ] = 0;
	r[ 8 ] = m[ 8 ] * invZ;
	r[ 9 ] = m[ 9 ] * invZ;
	r[ 10 ] = m[ 10 ] * invZ;
	r[ 11 ] = 0;
	r[ 12 ] = 0;
	r[ 13 ] = 0;
	r[ 14 ] = 0;
	r[ 15 ] = 1;
	rotation.setFromMat4( _rotation );

}
