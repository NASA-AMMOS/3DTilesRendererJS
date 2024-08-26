import { Vector3, Matrix4 } from 'three';

export const ENU_FRAME: Number;
export const CAMERA_FRAME: Number;
export const OBJECT_FRAME: Number;

type FRAME_TYPE = typeof ENU_FRAME | typeof CAMERA_FRAME | typeof OBJECT_FRAME;

export class Ellipsoid {

	radius: Vector3;

	constructor( x: Number, y: Number, z: Number );
	getCartographicToPosition( lat: Number, lon: Number, height: Number, target: Vector3 ): Vector3;
	getPositionToCartographic( pos: Vector3, target: Object ): { lat: Number, lon: Number, height: Number };
	getCartographicToNormal( lat: Number, lon: Number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;
	getPositionToSurfacePoint( pos: Vector3, target: Vector3 ): Vector3;

	getAzElRollFromRotationMatrix(
		lat: Number, lon: Number, rotationMatrix: Matrix4,
		target: Object, frame: FRAME_TYPE,
	): { azimuth: Number, elevation: Number, roll: Number };
	getRotationMatrixFromAzElRoll(
		lat: Number, lon: Number, az: Number, el: Number, roll: Number,
		target: Matrix4, frame: FRAME_TYPE,
	): Matrix4;

	getEastNorthUpFrame( lat: Number, lon: Number, target: Matrix4 ): Matrix4;
	getEastNorthUpAxes( lat: Number, lon: Number, vecEast: Vector3, vecNorth: Vector3, vecUp: Vector3, point?: Vector3 );

}
