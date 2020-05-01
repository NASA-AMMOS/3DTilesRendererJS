import { Box3, Camera, Vector2, WebGLRenderer } from 'three';
import { TilesRendererBase } from '../base/TilesRendererBase';
import { TilesGroup } from './TilesGroup';

class TilesRenderer extends TilesRendererBase {

	group : TilesGroup;

	getBounds( box : Box3 ) : Boolean;

	hasCamera( camera : Camera ) : Boolean;
	setCamera( camera : Camera ) : Boolean;
	deleteCamera( camera : Camera ) : Boolean;

	setResolution( camera : Camera, x : Number, y : Number ) : Boolean;
	setResolution( camera : Camera, resolution : Vector2 ) : Boolean;
	setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : Boolean;

}
