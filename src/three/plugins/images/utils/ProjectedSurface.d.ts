import { Vector2, Vector3 } from 'three';

export class ProjectedSurface {

	readonly isProjectedSurface: true;
	projection: object;
	scale: Vector2;
	offset: Vector2;

	constructor( projection?: object );

	getCartographicToPosition( lat: number, lon: number, height: number, target: Vector3 ): Vector3;
	getNormalizedToPosition( u: number, v: number, height: number, target: Vector3 ): Vector3;
	getPositionToCartographic( pos: Vector3, target: object ): { lat: number, lon: number, height: number };
	getCartographicToNormal( lat: number, lon: number, target: Vector3 ): Vector3;
	getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3;

}
