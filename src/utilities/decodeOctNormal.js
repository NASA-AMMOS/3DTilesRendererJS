import { Vector2, MathUtils, Vector3 } from 'three';

const f = new Vector2();

/**
 * Decode an octahedron-encoded normal (as a pair of 8-bit unsigned numbers) into a Vector3.
 *
 * Resources:
 * - https://stackoverflow.com/a/74745666/2704779
 * - https://knarkowicz.wordpress.com/2014/04/16/octahedron-normal-vector-encoding/
 * @param {number} x The unsigned 8-bit X coordinate on the projected octahedron.
 * @param {number} y The unsigned 8-bit Y coordinate on the projected octahedron.
 * @param {Vector3} [target] The target vector.
 */
export function decodeOctNormal( x, y, target = new Vector3() ) {

	f.set( x, y ).divideScalar( 256 ).multiplyScalar( 2 ).subScalar( 1 );

	target.set( f.x, f.y, 1 - Math.abs( f.x ) - Math.abs( f.y ) );

	const t = MathUtils.clamp( - target.z, 0, 1 );

	if ( target.x >= 0 ) {

		target.setX( target.x - t );

	} else {

		target.setX( target.x + t );

	}

	if ( target.y >= 0 ) {

		target.setY( target.y - t );

	} else {

		target.setY( target.y + t );

	}

	target.normalize();

	return target;

}
