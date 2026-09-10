import { DataTexture, Matrix4, Object3D, Vector3 } from 'three';
import { TilesRenderer } from '3d-tiles-renderer/three';

export type PolygonClippingPoint = [ number, number ];
export type PolygonClippingRing = PolygonClippingPoint[];
export type PolygonClippingPolygon = PolygonClippingRing[];
export interface PolygonClippingPluginOptions {

	polygons?: PolygonClippingPolygon[];
	frame?: Matrix4;
	inverse?: boolean;
	resolution?: number;
	padding?: number;
	enabled?: boolean;

}

export class PolygonClippingPlugin {

	readonly name: 'POLYGON_CLIPPING_PLUGIN';
	readonly texture: DataTexture | null;
	tiles: TilesRenderer | null;
	frame: Matrix4;
	resolution: number;
	padding: number;
	polygons: PolygonClippingPolygon[];
	enabled: boolean;
	inverse: boolean;

	constructor( options?: PolygonClippingPluginOptions );
	init( tiles: TilesRenderer ): void;
	processTileModel( scene: Object3D ): void;
	setPolygons( polygons: PolygonClippingPolygon[] ): void;
	setFrame( frame: Matrix4 ): void;
	update(): void;
	isPointClipped( point: Vector3 ): boolean;
	dispose(): void;

}
