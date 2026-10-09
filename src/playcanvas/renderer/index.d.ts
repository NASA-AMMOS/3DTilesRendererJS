import { Tile, TilesRendererBase, TilesRendererBaseEventMap } from '3d-tiles-renderer/core';
import { AppBase, CameraComponent, Entity, Vec3 } from 'playcanvas';

type Matrix = ArrayLike<number> & { [ index: number ]: number };

export const ENU_FRAME: 0;
export const CAMERA_FRAME: 1;
export const OBJECT_FRAME: 2;

export class Ellipsoid {

	name: string;
	radius: Vec3;

	constructor( x?: number, y?: number, z?: number );

	getEastNorthUpFrame( lat: number, lon: number, height: number, target: Matrix ): Matrix;
	getObjectFrame( lat: number, lon: number, height: number, az: number, el: number, roll: number, target: Matrix, frame?: number ): Matrix;
	getEastNorthUpAxes( lat: number, lon: number, vecEast: Vec3, vecNorth: Vec3, vecUp: Vec3 ): void;
	getCartographicToPosition( lat: number, lon: number, height: number, target: Vec3 ): Vec3;
	getPositionToCartographic( pos: Vec3, target: { lat?: number, lon?: number, height?: number } ): { lat: number, lon: number, height: number };
	getCartographicToNormal( lat: number, lon: number, target: Vec3 ): Vec3;
	getPositionToNormal( pos: Vec3, target: Vec3 ): Vec3;
	getPositionToSurfacePoint( pos: Vec3, target: Vec3 ): Vec3 | null;
	copy( source: Ellipsoid ): this;

}

export const WGS84_ELLIPSOID: Ellipsoid;

export class EllipsoidRegion extends Ellipsoid {

	latStart: number;
	latEnd: number;
	lonStart: number;
	lonEnd: number;
	heightStart: number;
	heightEnd: number;

	constructor(
		x?: number, y?: number, z?: number,
		latStart?: number, latEnd?: number,
		lonStart?: number, lonEnd?: number,
		heightStart?: number, heightEnd?: number,
	);

	getBoundingBox( min: Vec3, max: Vec3, matrix: Matrix ): void;

}

export interface TilesRendererEventMap extends TilesRendererBaseEventMap<Entity> {
	'add-camera': { camera: CameraComponent };
	'delete-camera': { camera: CameraComponent };
}

export class TilesRenderer<TEventMap extends TilesRendererEventMap = TilesRendererEventMap> extends TilesRendererBase<TEventMap> {

	app: AppBase;
	group: Entity;
	cameras: CameraComponent[];
	ellipsoid: Ellipsoid;
	assetOptions: object | null;
	renderOptions: object | null;

	constructor( url: string | null, app: AppBase );

	hasCamera( camera: CameraComponent ): boolean;
	setCamera( camera: CameraComponent ): boolean;
	deleteCamera( camera: CameraComponent ): boolean;

	setTilesetTransform( matrix: ArrayLike<number> ): void;
	getTilesetTransform<T extends Matrix>( target: T ): T;
	forEachLoadedModel( callback: ( scene: Entity, tile: Tile ) => void ): void;

	on<T extends keyof TEventMap>(
		type: T,
		listener: ( event: TEventMap[ T ] & { type: T } ) => void
	): this;
	on( type: string, listener: ( event: any ) => void ): this;

	off<T extends keyof TEventMap>(
		type: T,
		listener: ( event: TEventMap[ T ] & { type: T } ) => void
	): this;
	off( type: string, listener: ( event: any ) => void ): this;

}
