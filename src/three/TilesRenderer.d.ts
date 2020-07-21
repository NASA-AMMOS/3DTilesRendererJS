import { Box3, Camera, Vector2, WebGLRenderer, Object3D } from 'three';
import { TilesRendererBase } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';
import { DracoLoader } from 'three/examples/jsm/loaders/DracoLoader';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

export class TilesRenderer extends TilesRendererBase {

	autoDisableRendererCulling : Boolean;

	group : TilesGroup;

	getBounds( box : Box3 ) : Boolean;

	hasCamera( camera : Camera ) : Boolean;
	setCamera( camera : Camera ) : Boolean;
	deleteCamera( camera : Camera ) : Boolean;

	setResolution( camera : Camera, x : Number, y : Number ) : Boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : Boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : Boolean;

	onLoadModel : ( ( scene : Object3D, tile : object ) => void ) | null;
	onDisposeModel : ( ( scene : Object3D, tile : object ) => void ) | null;
	forEachLoadedModel( callback : ( scene : Object3D, tile : object ) => void );

	setDracoLoader( loader : DracoLoader | null ) : void;
	setDDSLoader( loader : DDSLoader | null ) : void;
	setKTX2Loader( loader : KTX2Loader | null ) : void;

}
