import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FadeManager } from '../../../core/plugins/fade/FadeManager.js';
import { FadeMaterialManager } from './FadeMaterialManager.js';

const HAS_POPPED_IN = Symbol( 'HAS_POPPED_IN' );
const _fromPosition = /* @__PURE__ */ new Vector3();
const _toPosition = /* @__PURE__ */ new Vector3();
const _fromRotation = /* @__PURE__ */ new Quaternion();
const _toRotation = /* @__PURE__ */ new Quaternion();
const _scale = /* @__PURE__ */ new Vector3();

function tileWasInFrustumLastFrame( tile ) {

	let current = tile;
	while ( current ) {

		if ( current.traversal.wasSetActive ) {

			return current.traversal.wasInFrustum;

		}

		current = current.parent;

	}

	return false;

}

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

function forEachLoadedModel( tiles, callback ) {

	tiles.traverse( tile => {

		const scene = tile.engineData?.scene;
		if ( scene ) {

			callback( scene, tile );

		}

		return false;

	}, null, false );

}

function onUpdateAfter() {

	const fadeManager = this._fadeManager;
	const tiles = this.tiles;

	fadeManager.update();

	const fadingAfter = fadeManager.fadeCount;
	if ( this._fadingBefore !== 0 && fadingAfter !== 0 ) {

		tiles.dispatchEvent( { type: 'fade-change' } );
		tiles.dispatchEvent( { type: 'needs-render' } );

	}

	const camera = tiles.scene.activeCamera;
	const cameraMatrix = getCameraMatrix( camera );
	if (
		this.maximumFadeOutTiles < this._fadingOutCount &&
		camera === this._previousCamera &&
		cameraMovedFast( this._previousCameraMatrix, cameraMatrix )
	) {

		fadeManager.completeAllFades();

	}

	this._previousCamera = camera;
	this._previousCameraMatrix = cameraMatrix ? cameraMatrix.clone() : null;

	fadeManager.forEachObject( ( tile, { fadeIn, fadeOut } ) => {

		tiles.markTileUsed( tile );
		this._fadeMaterialManager.setFade( tile.engineData.scene, fadeIn, fadeOut );

	} );

}

export class TilesFadePlugin {

	get fadeDuration() {

		return this._fadeManager.duration;

	}

	set fadeDuration( value ) {

		this._fadeManager.duration = Number( value );

	}

	get fadingTiles() {

		return this._fadeManager.fadeCount;

	}

	constructor( options ) {

		options = {
			maximumFadeOutTiles: 50,
			fadeRootTiles: false,
			fadeDuration: 250,
			...options,
		};

		this.name = 'FADE_TILES_PLUGIN';
		this.priority = - 2;
		this.tiles = null;
		this.maximumFadeOutTiles = options.maximumFadeOutTiles;
		this.fadeRootTiles = options.fadeRootTiles;
		this._quickFadeTiles = new Set();
		this._fadeManager = new FadeManager();
		this._fadeMaterialManager = new FadeMaterialManager();
		this._fadingOutCount = 0;
		this._previousCamera = null;
		this._previousCameraMatrix = null;
		this.fadeDuration = options.fadeDuration;

	}

	init( tiles ) {

		this.tiles = tiles;
		this._onLoadModel = ( { scene } ) => {

			this._fadeMaterialManager.prepareScene( scene );

		};

		this._onDisposeModel = ( { tile, scene } ) => {

			if ( tiles.visibleTiles.has( tile ) && tile.parent ) {

				this._quickFadeTiles.add( tile.parent );

			}

			this._fadeManager.deleteObject( tile );
			this._fadeMaterialManager.deleteScene( scene );

		};

		this._onUpdateBefore = () => {

			this._fadingBefore = this._fadeManager.fadeCount;

		};

		this._onUpdateAfter = () => onUpdateAfter.call( this );

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'update-before', this._onUpdateBefore );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

		const fadeManager = this._fadeManager;
		fadeManager.onFadeSetStart = () => {

			tiles.dispatchEvent( { type: 'fade-start' } );
			tiles.dispatchEvent( { type: 'needs-render' } );

		};

		fadeManager.onFadeSetComplete = () => {

			tiles.dispatchEvent( { type: 'fade-end' } );
			tiles.dispatchEvent( { type: 'needs-render' } );

		};

		fadeManager.onFadeComplete = ( tile, visible ) => {

			this._fadeMaterialManager.resetScene( tile.engineData.scene );
			if ( ! visible ) {

				tiles.invokeOnePlugin( plugin => plugin !== this && plugin.setTileVisible && plugin.setTileVisible( tile, false ) );
				this._fadingOutCount --;

			}

		};

		const camera = tiles.scene.activeCamera;
		const cameraMatrix = getCameraMatrix( camera );
		this._previousCamera = camera;
		this._previousCameraMatrix = cameraMatrix ? cameraMatrix.clone() : null;

		forEachLoadedModel( tiles, scene => this._fadeMaterialManager.prepareScene( scene ) );

	}

	setTileVisible( tile, visible ) {

		const fadeManager = this._fadeManager;
		const wasFading = fadeManager.isFading( tile );

		if ( ! tileWasInFrustumLastFrame( tile ) ) {

			if ( wasFading ) {

				fadeManager.completeFade( tile );

			}

			return false;

		}

		if ( fadeManager.isFadingOut( tile ) ) {

			this._fadingOutCount --;

		}

		if ( ! visible ) {

			this._fadingOutCount ++;
			fadeManager.fadeOut( tile );

		} else {

			const isRootRenderableTile = tile.internal.depthFromRenderedParent === 1;
			if ( isRootRenderableTile ) {

				if ( tile[ HAS_POPPED_IN ] || this.fadeRootTiles ) {

					fadeManager.fadeIn( tile );

				}

				tile[ HAS_POPPED_IN ] = true;

			} else {

				fadeManager.fadeIn( tile );

			}

		}

		if ( this._quickFadeTiles.has( tile ) ) {

			fadeManager.completeFade( tile );
			this._quickFadeTiles.delete( tile );

		}

		if ( wasFading ) {

			return true;

		}

		return ! visible && fadeManager.isFading( tile );

	}

	dispose() {

		const tiles = this.tiles;
		this._fadeManager.completeAllFades();

		tiles.removeEventListener( 'load-model', this._onLoadModel );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		tiles.removeEventListener( 'update-before', this._onUpdateBefore );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );

		this._fadeMaterialManager.dispose();
		this._quickFadeTiles.clear();
		this.tiles = null;
		this._previousCamera = null;
		this._previousCameraMatrix = null;

	}

}
