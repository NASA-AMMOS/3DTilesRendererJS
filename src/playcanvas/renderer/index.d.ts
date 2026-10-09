import { TilesRendererBase, TilesRendererBaseEventMap } from '3d-tiles-renderer/core';
import { AppBase, CameraComponent, Entity } from 'playcanvas';

export interface TilesRendererEventMap extends TilesRendererBaseEventMap<Entity> {
	'add-camera': { camera: CameraComponent };
	'delete-camera': { camera: CameraComponent };
}

export class TilesRenderer<TEventMap extends TilesRendererEventMap = TilesRendererEventMap> extends TilesRendererBase<TEventMap> {

	app: AppBase;
	group: Entity;
	cameras: CameraComponent[];
	assetOptions: object | null;
	renderOptions: object | null;

	constructor( url: string, app: AppBase );

	hasCamera( camera: CameraComponent ): boolean;
	setCamera( camera: CameraComponent ): boolean;
	deleteCamera( camera: CameraComponent ): boolean;

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
