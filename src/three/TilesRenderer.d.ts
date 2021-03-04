import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager } from 'three';
import { TilesRendererBase } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';

export class TilesRenderer extends TilesRendererBase {

	autoDisableRendererCulling : Boolean;

	manager : LoadingManager;

	group : TilesGroup;

	getBoundsTransform(target: Matrix4) : Boolean;

	getBounds( box : Box3 ) : Boolean;

	hasCamera( camera : Camera ) : Boolean;
	setCamera( camera : Camera ) : Boolean;
	deleteCamera( camera : Camera ) : Boolean;

	setResolution( camera : Camera, x : Number, y : Number ) : Boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : Boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : Boolean;

	forEachLoadedModel( callback : ( scene : Object3D, tile : object ) => void ) : void;

	onLoadTileSet : ( ( tileSet : object ) => void ) | null;
	onLoadModel : ( ( scene : Object3D, tile : object ) => void ) | null;
	onDisposeModel : ( ( scene : Object3D, tile : object ) => void ) | null;

}
