import { Vector3 } from 'three';

export const WGS84_RADIUS;
export const WGS84_FLATTENING;
export const WGS84_HEIGHT;

export class Ellipsoid {

	radius: Vector3;

	constructor( x: Number, y: Number, z: Number );
	getCartographicToPosition( lat: Number, lon: Number, height: Number, target: Vector3 ): Vector3;
	getCartographicToNormal( lat: Number, lon: Number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;

}
