import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TilesFadePluginBase } from '../../../core/plugins/fade/TilesFadePluginBase.js';
import { FadeMaterialManager } from './FadeMaterialManager.js';

const _fromPosition = /* @__PURE__ */ new Vector3();
const _toPosition = /* @__PURE__ */ new Vector3();
const _fromRotation = /* @__PURE__ */ new Quaternion();
const _toRotation = /* @__PURE__ */ new Quaternion();
const _scale = /* @__PURE__ */ new Vector3();

function getCameraMatrix( camera ) {

	if ( ! camera ) {

		return null;

	}

	camera.computeWorldMatrix( true );
	return camera.getWorldMatrix();

}

function cameraMovedFast( previous, current ) {

	if ( ! previous || ! current ) {

		return false;

	}

	previous.decompose( _scale, _fromRotation, _fromPosition );
	current.decompose( _scale, _toRotation, _toPosition );

	const dot = Math.min( 1, Math.abs( Quaternion.Dot( _fromRotation, _toRotation ) ) );
	const angle = 2 * Math.acos( dot );
	return angle > 0.25 + 1e-6 || Vector3.Distance( _fromPosition, _toPosition ) > 0.1 + 1e-6;

}

export class TilesFadePlugin extends TilesFadePluginBase {

	constructor( options ) {

		super( options );
		this._fadeMaterialManager = new FadeMaterialManager();
		this._previousCamera = null;
		this._previousCameraMatrix = null;

	}

	init( tiles ) {

		const camera = tiles.scene.activeCamera;
		const cameraMatrix = getCameraMatrix( camera );
		this._previousCamera = camera;
		this._previousCameraMatrix = cameraMatrix ? cameraMatrix.clone() : null;
		super.init( tiles );

	}

	prepareTileScene( scene ) {

		this._fadeMaterialManager.prepareScene( scene );

	}

	releaseTileScene( scene ) {

		this._fadeMaterialManager.deleteScene( scene );

	}

	setFadeState( tile, fadeIn, fadeOut ) {

		this._fadeMaterialManager.setFade( tile.engineData?.scene, fadeIn, fadeOut );

	}

	resetFadeState( tile ) {

		this._fadeMaterialManager.resetScene( tile.engineData?.scene );

	}

	updateCameraState( checkMovement ) {

		const camera = this.tiles.scene.activeCamera;
		const cameraMatrix = getCameraMatrix( camera );
		const movedFast = checkMovement && camera === this._previousCamera &&
			cameraMovedFast( this._previousCameraMatrix, cameraMatrix );

		this._previousCamera = camera;
		this._previousCameraMatrix = cameraMatrix ? cameraMatrix.clone() : null;
		return movedFast;

	}

	dispose() {

		super.dispose();
		this._fadeMaterialManager.dispose();
		this._previousCamera = null;
		this._previousCameraMatrix = null;

	}

}
