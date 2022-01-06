import { Box3, Camera, Vector2, Matrix4, WebGLRenderer, Object3D, LoadingManager } from 'three';
import { Tile } from '../base/Tile';
import { Tileset } from '../base/Tileset';
import { TilesRendererBase } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';

export class TilesRenderer extends TilesRendererBase {

	autoDisableRendererCulling : Boolean;
	optimizeRaycast : Boolean;

	manager : LoadingManager;

	group : TilesGroup;

	getBoundsTransform( target: Matrix4 ) : Boolean;

	getBounds( box : Box3 ) : Boolean;

	hasCamera( camera : Camera ) : Boolean;
	setCamera( camera : Camera ) : Boolean;
	deleteCamera( camera : Camera ) : Boolean;

	setResolution( camera : Camera, x : Number, y : Number ) : Boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : Boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : Boolean;

	forEachLoadedModel( callback : ( scene : Object3D, tile : Tile ) => void ) : void;

	onLoadTileSet : ( ( tileSet : Tileset ) => void ) | null;
	onLoadModel : ( ( scene : Object3D, tile : Tile ) => void ) | null;
	onDisposeModel : ( ( scene : Object3D, tile : Tile ) => void ) | null;
	onTileVisibilityChange : ( ( scene : Object3D, tile : Tile, visible : boolean ) => void ) | null;

}
