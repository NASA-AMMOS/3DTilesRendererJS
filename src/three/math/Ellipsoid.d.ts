import { Vector3, Matrix4 } from 'three';

export class Ellipsoid {

	radius: Vector3;

	constructor( x: Number, y: Number, z: Number );
	getCartographicToPosition( lat: Number, lon: Number, height: Number, target: Vector3 ): Vector3;
	getPositionToCartographic( pos: Vector3, target: Object ): Vector3;
	getCartographicToNormal( lat: Number, lon: Number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;
	getPositionToSurfacePoint( pos: Vector3, target: Vector3 ): Vector3;

	getEastNorthUpFrame( lat: Number, lon: Number, target: Matrix4 ): Matrix4;
	getEastNorthUpAxes( lat: Number, lon: Number, vecEast: Vector3, vecNorth: Vector3, vecUp: Vector3, point?: Vector3 ) {

}
