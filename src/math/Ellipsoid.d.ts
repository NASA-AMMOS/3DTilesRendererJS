import { Vector3 } from 'three';
export class Ellipsoid {

	radius: Vector3;
	getCartographicToPosition( lat: Number, lon: Number, height: Number, target: Vector3 ): Vector3;
	getCartographicToNormal( lat: Number, lon: Number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;

}
