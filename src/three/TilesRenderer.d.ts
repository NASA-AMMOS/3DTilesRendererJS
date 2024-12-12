import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager, Sphere, EventListener, EventDispatcher, BaseEvent } from 'three';
import { Tile } from '../base/Tile';
import { TilesRendererBase } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';
import { Ellipsoid } from './math/Ellipsoid';

export interface TilesRendererEventMap {
	'add-camera': { camera: Camera };
	'delete-camera': { camera: Camera };
	'camera-resolution-change': {};
	'load-tile-set': { tileSet: object, url: string };
	'tiles-load-start': {};
	'tiles-load-end': {};
	'load-content': {};
	'load-model': { scene: Object3D; tile: Tile };
	'dispose-model': { scene: Object3D; tile: Tile };
	'tile-visibility-change': { scene: Object3D; tile: Tile; visible: boolean };
	'update-before': {};
	'update-after': {};
}

export class TilesRenderer extends TilesRendererBase implements EventDispatcher<TilesRendererEventMap> {

	ellipsoid: Ellipsoid;
	autoDisableRendererCulling : Boolean;
	optimizeRaycast : Boolean;

	manager : LoadingManager;

	group : TilesGroup;

	getBoundingBox( box : Box3 ) : Boolean;
	getOrientedBoundingBox( box : Box3, matrix : Matrix4 ) : Boolean;
	getBoundingSphere( sphere: Sphere ) : Boolean;

	hasCamera( camera : Camera ) : Boolean;
	setCamera( camera : Camera ) : Boolean;
	deleteCamera( camera : Camera ) : Boolean;

	setResolution( camera : Camera, x : Number, y : Number ) : Boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : Boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : Boolean;

	forEachLoadedModel( callback : ( scene : Object3D, tile : Tile ) => void ) : void;

	/**
	 * Adds a listener to an event type.
	 * @param type The type of event to listen to.
	 * @param listener The function that gets called when the event is fired.
	 */
	addEventListener<T extends Extract<keyof TilesRendererEventMap, string>>(
		type: T,
		listener: EventListener<TilesRendererEventMap[T], T, this>
	): void;
	addEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): void;

	/**
	 * Checks if listener is added to an event type.
	 * @param type The type of event to listen to.
	 * @param listener The function that gets called when the event is fired.
	 */
	hasEventListener<T extends Extract<keyof TilesRendererEventMap, string>>(
		type: T,
		listener: EventListener<TilesRendererEventMap[T], T, this>
	): boolean;
	hasEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): boolean;

	/**
	 * Removes a listener from an event type.
	 * @param type The type of the listener that gets removed.
	 * @param listener The listener function that gets removed.
	 */
	removeEventListener<T extends Extract<keyof TilesRendererEventMap, string>>(
		type: T,
		listener: EventListener<TilesRendererEventMap[T], T, this>
	): void;
	removeEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): void;

	/**
	 * Fire an event type.
	 * @param event The event that gets fired.
	 */
	dispatchEvent<T extends Extract<keyof TilesRendererEventMap, string>>(
		event: BaseEvent<T> & TilesRendererEventMap[T]
	): void;

}
