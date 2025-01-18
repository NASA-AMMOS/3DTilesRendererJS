import { Vector3, Matrix4 } from 'three';

export enum Frames {}
export const ENU_FRAME: Frames;
export const CAMERA_FRAME: Frames;
export const OBJECT_FRAME: Frames;

export class Ellipsoid {

	radius: Vector3;
	name: string;

	constructor( x: number, y: number, z: number );
	getCartographicToPosition( lat: number, lon: number, height: number, target: Vector3 ): Vector3;
	getPositionToCartographic( pos: Vector3, target: object ): { lat: number, lon: number, height: number };
	getCartographicToNormal( lat: number, lon: number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;
	getPositionToSurfacePoint( pos: Vector3, target: Vector3 ): Vector3;

	getAzElRollFromRotationMatrix(
		lat: number, lon: number, rotationMatrix: Matrix4,
		target: object, frame: Frames,
	): { azimuth: number, elevation: number, roll: number };
	getRotationMatrixFromAzElRoll(
		lat: number, lon: number, az: number, el: number, roll: number,
		target: Matrix4, frame: Frames,
	): Matrix4;

	getFrame(
		lat: number, lon: number, az: number, el: number, roll: number, height: number,
		target: Matrix4, frame: Frames,
	): Matrix4;

	getEastNorthUpFrame( lat: number, lon: number, target: Matrix4 ): Matrix4;
	getEastNorthUpAxes( lat: number, lon: number, vecEast: Vector3, vecNorth: Vector3, vecUp: Vector3, point?: Vector3 );

}
