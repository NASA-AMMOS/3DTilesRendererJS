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

export class TilesRenderer<TEventMap extends TilesRendererEventMap = TilesRendererEventMap> extends TilesRendererBase implements EventDispatcher<TEventMap> {

	ellipsoid: Ellipsoid;
	autoDisableRendererCulling : boolean;
	optimizeRaycast : boolean;

	manager : LoadingManager;

	group : TilesGroup;

	getBoundingBox( box : Box3 ) : boolean;
	getOrientedBoundingBox( box : Box3, matrix : Matrix4 ) : boolean;
	getBoundingSphere( sphere: Sphere ) : boolean;

	hasCamera( camera : Camera ) : boolean;
	setCamera( camera : Camera ) : boolean;
	deleteCamera( camera : Camera ) : boolean;

	setResolution( camera : Camera, x : number, y : number ) : boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : boolean;

	forEachLoadedModel( callback : ( scene : Object3D, tile : Tile ) => void ) : void;

	/**
	 * Adds a listener to an event type.
	 * @param type The type of event to listen to.
	 * @param listener The function that gets called when the event is fired.
	 */
	addEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
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
	hasEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
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
	removeEventListener<T extends Extract<keyof TEventMap, string>>(
		type: T,
		listener: EventListener<TEventMap[T], T, this>
	): void;
	removeEventListener<T extends string>(
		type: T,
		listener: EventListener<{}, T, this>
	): void;

	/**
	 * Fire an event type.
	 * @param event The event that gets fired.
	 */
	dispatchEvent<T extends Extract<keyof TEventMap, string>>(
		event: BaseEvent<T> & TEventMap[T]
	): void;

}
