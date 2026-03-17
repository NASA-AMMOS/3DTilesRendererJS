import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager, Sphere } from 'three';
import { Tile, TilesRendererBase, TilesRendererBaseEventMap } from '3d-tiles-renderer/core';
import { TilesGroup } from './TilesGroup.js';
import { Ellipsoid } from '../math/Ellipsoid.js';

export interface TilesRendererEventMap extends TilesRendererBaseEventMap<Object3D> {
	'add-camera': { camera: Camera };
	'delete-camera': { camera: Camera };
	'camera-resolution-change': {};
}

export class TilesRenderer<TEventMap extends TilesRendererEventMap = TilesRendererEventMap> extends TilesRendererBase<TEventMap> {

	ellipsoid: Ellipsoid;
	cameras: Camera[];
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

}
