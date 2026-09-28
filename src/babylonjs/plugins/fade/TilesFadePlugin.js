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

/**
 * Plugin that overrides Babylon.js material shaders to fade tile geometry in and out as
 * tile LODs change, preventing pop-in. Dispatches `fade-change`, `fade-start`, and
 * `fade-end` events on the `TilesRenderer` during animation for on-demand rendering.
 *
 * Fading uses the `DitheredTileFadeMaterialPlugin` API available in Babylon.js 9.26.1
 * and later. With an older compatible Babylon.js version, registration warns once and
 * gracefully leaves normal, non-fading tile rendering unchanged.
 * Tiles containing unsupported materials or instances also render without fading.
 * @param {Object} [options]
 * @param {number} [options.fadeDuration=250] Time in milliseconds for a tile to fully fade in or out.
 * @param {number} [options.maximumFadeOutTiles=50] Maximum simultaneous fade-out tiles. If exceeded, tiles pop instead of fading.
 * @param {boolean} [options.fadeRootTiles=false] Whether root-level tiles fade in on their first appearance.
 */
export class TilesFadePlugin extends TilesFadePluginBase {

	constructor( options ) {

		super( options );
		this._fadeMaterialManager = new FadeMaterialManager();
		this._previousCamera = null;
		this._previousCameraMatrix = null;
		this._initialized = false;
		this._warnedUnsupported = false;

	}

	init( tiles ) {

		if ( ! this._fadeMaterialManager.supported ) {

			if ( ! this._warnedUnsupported ) {

				console.warn( 'TilesFadePlugin: Babylon.js tile fading is unavailable because the required DitheredTileFadeMaterialPlugin API is absent. Tiles will render normally without fading.' );
				this._warnedUnsupported = true;

			}

			return;

		}

		const camera = tiles.scene.activeCamera;
		const cameraMatrix = getCameraMatrix( camera );
		this._previousCamera = camera;
		this._previousCameraMatrix = cameraMatrix ? cameraMatrix.clone() : null;
		super.init( tiles );
		this._initialized = true;

	}

	setTileVisible( tile, visible ) {

		if ( ! this._initialized || ! this._fadeMaterialManager.isSceneSupported( tile.engineData?.scene ) ) {

			return false;

		}

		return super.setTileVisible( tile, visible );

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

		if ( this._initialized ) {

			super.dispose();
			this._initialized = false;

		}

		this._fadeMaterialManager.dispose();
		this._previousCamera = null;
		this._previousCameraMatrix = null;

	}

}
