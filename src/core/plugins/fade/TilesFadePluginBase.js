import { FadeManager } from './FadeManager.js';

const HAS_POPPED_IN = Symbol( 'HAS_POPPED_IN' );

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

export class TilesFadePluginBase {

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
		this._fadingOutCount = 0;
		this._fadingBefore = 0;
		this.fadeDuration = options.fadeDuration;

	}

	init( tiles ) {

		this.tiles = tiles;
		this._onLoadModel = ( { scene, tile } ) => {

			this.prepareTileScene( scene, tile );

		};

		this._onDisposeModel = ( { tile, scene } ) => {

			if ( tiles.visibleTiles.has( tile ) && tile.parent ) {

				this._quickFadeTiles.add( tile.parent );

			}

			this._fadeManager.deleteObject( tile );
			this.releaseTileScene( scene, tile );

		};

		this._onUpdateBefore = () => {

			this._fadingBefore = this._fadeManager.fadeCount;

		};

		this._onUpdateAfter = () => this._updateAfter();

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

			this.resetFadeState( tile, visible );
			if ( ! visible ) {

				tiles.invokeOnePlugin( plugin => plugin !== this && plugin.setTileVisible && plugin.setTileVisible( tile, false ) );
				this._fadingOutCount --;

			}

		};

		this._forEachLoadedModel( ( scene, tile ) => this.prepareTileScene( scene, tile ) );

	}

	_updateAfter() {

		const fadeManager = this._fadeManager;
		const tiles = this.tiles;

		fadeManager.update();

		const fadingAfter = fadeManager.fadeCount;
		if ( this._fadingBefore !== 0 && fadingAfter !== 0 ) {

			tiles.dispatchEvent( { type: 'fade-change' } );
			tiles.dispatchEvent( { type: 'needs-render' } );

		}

		const exceedsFadeLimit = this.maximumFadeOutTiles < this._fadingOutCount;
		const cameraMovedFast = this.updateCameraState( exceedsFadeLimit );
		if ( exceedsFadeLimit && cameraMovedFast ) {

			fadeManager.completeAllFades();

		}

		fadeManager.forEachObject( ( tile, { fadeIn, fadeOut } ) => {

			tiles.markTileUsed( tile );
			this.setFadeState( tile, fadeIn, fadeOut );

		} );

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

		this._forEachLoadedModel( ( scene, tile ) => {

			this._fadeManager.deleteObject( tile );
			this.releaseTileScene( scene, tile );

		} );

		this._fadeManager.onFadeSetStart = null;
		this._fadeManager.onFadeSetComplete = null;
		this._fadeManager.onFadeComplete = null;
		this._quickFadeTiles.clear();
		this.tiles = null;

	}

	_forEachLoadedModel( callback ) {

		this.tiles.traverse( tile => {

			const scene = tile.engineData?.scene;
			if ( scene ) {

				callback( scene, tile );

			}

			return false;

		}, null, false );

	}

	prepareTileScene() {

		throw new Error( 'TilesFadePluginBase: prepareTileScene must be implemented.' );

	}

	releaseTileScene() {

		throw new Error( 'TilesFadePluginBase: releaseTileScene must be implemented.' );

	}

	setFadeState() {

		throw new Error( 'TilesFadePluginBase: setFadeState must be implemented.' );

	}

	resetFadeState() {

		throw new Error( 'TilesFadePluginBase: resetFadeState must be implemented.' );

	}

	updateCameraState() {

		throw new Error( 'TilesFadePluginBase: updateCameraState must be implemented.' );

	}

}
