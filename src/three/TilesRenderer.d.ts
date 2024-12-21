import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager, Sphere } from 'three';
import { Tile } from '../base/Tile';
import { TilesRendererBase, TilesRendererBasePlugin } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';
import { Ellipsoid } from './math/Ellipsoid';

export interface TilesRendererPlugin extends TilesRendererBasePlugin {
	processTileModel?: ( scene: Object3D, tile: Tile ) => Promise<void>;
	doTilesNeedUpdate?: () => boolean;
}

export class TilesRenderer extends TilesRendererBase<TilesRendererPlugin> {

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

	addEventListener( type: string, cb: ( e : object ) => void );
	hasEventListener( type: string, cb: ( e : object ) => void );
	removeEventListener( type: string, cb: ( e : object ) => void );
	dispatchEvent( e : object );

}
