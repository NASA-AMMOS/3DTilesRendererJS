import { Matrix4, Vector3, Quaternion } from 'three';
import { FadeManager } from './FadeManager.js';
import { FadeMaterialManager } from './FadeMaterialManager.js';
import { FadeBatchedMesh } from './FadeBatchedMesh.js';

const HAS_POPPED_IN = Symbol( 'HAS_POPPED_IN' );
const _fromPos = new Vector3();
const _toPos = new Vector3();
const _fromQuat = new Quaternion();
const _toQuat = new Quaternion();
const _scale = new Vector3();

function onUpdateBefore() {

	const fadeManager = this._fadeManager;
	const tiles = this.tiles;

	// store the tiles renderer state before the tiles update so we can check
	// whether fading started or stopped completely
	this._fadingBefore = fadeManager.fadeCount;
	this._displayActiveTiles = tiles.displayActiveTiles;

	// we need to display all active tiles in this case so we don't fade tiles in
	// when moving from off screen
	tiles.displayActiveTiles = true;

}

function onUpdateAfter() {

	const fadeManager = this._fadeManager;
	const fadeMaterialManager = this._fadeMaterialManager;
	const displayActiveTiles = this._displayActiveTiles;
	const fadingBefore = this._fadingBefore;
	const prevCameraTransforms = this._prevCameraTransforms;
	const { tiles, maximumFadeOutTiles, batchedMesh } = this;
	const { cameras } = tiles;

	// reset the active tiles flag
	tiles.displayActiveTiles = displayActiveTiles;

	// update fade step
	fadeManager.update();

	// fire an event
	const fadingAfter = fadeManager.fadeCount;
	if ( fadingBefore !== 0 && fadingAfter !== 0 ) {

		tiles.dispatchEvent( { type: 'fade-change' } );
		tiles.dispatchEvent( { type: 'force-rerender' } );

	}

	// update the visibility of tiles based on visibility since we must use
	// the active tiles for rendering fade
	if ( ! displayActiveTiles ) {

		tiles.visibleTiles.forEach( t => {

			// if a tile is fading out then it may not be traversed and thus will not have
			// the frustum flag set correctly.
			const scene = t.cached.scene;
			if ( scene ) {

				scene.visible = t.__inFrustum;

			}

			this.forEachBatchIds( t, ( id, batchedMesh, plugin ) => {

				batchedMesh.setVisibleAt( id, t.__inFrustum );
				plugin.batchedMesh.setVisibleAt( id, t.__inFrustum );

			} );

		} );

	}

	if ( maximumFadeOutTiles < this._fadingOutCount ) {

		// determine whether all the rendering cameras are moving
		// quickly so we can adjust how tiles fade accordingly
		let isMovingFast = true;
		cameras.forEach( camera => {

			if ( ! prevCameraTransforms.has( camera ) ) {

				return;

			}

			const currMatrix = camera.matrixWorld;
			const prevMatrix = prevCameraTransforms.get( camera );

			currMatrix.decompose( _toPos, _toQuat, _scale );
			prevMatrix.decompose( _fromPos, _fromQuat, _scale );

			const angleTo = _toQuat.angleTo( _fromQuat );
			const positionTo = _toPos.distanceTo( _fromPos );

			// if rotation is moving > 0.25 radians per frame or position is moving > 0.1 units
			// then we are considering the camera to be moving too fast to notice a faster / abrupt fade
			isMovingFast = isMovingFast && ( angleTo > 0.25 || positionTo > 0.1 );

		} );

		if ( isMovingFast ) {

			fadeManager.completeAllFades();

		}

	}

	// track the camera movement so we can use it for next frame
	cameras.forEach( camera => {

		prevCameraTransforms.get( camera ).copy( camera.matrixWorld );

	} );

	// update the fade state for each tile
	fadeManager.forEachObject( ( tile, { fadeIn, fadeOut } ) => {

		// prevent faded tiles from being unloaded
		const scene = tile.cached.scene;
		const isFadingOut = fadeManager.isFadingOut( tile );
		tiles.markTileUsed( tile );
		if ( scene ) {

			fadeMaterialManager.setFade( scene, fadeIn, fadeOut );
			if ( isFadingOut ) {

				scene.visible = true;

			}

		}

		// fade the tiles and toggle the visibility appropriately
		this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

			batchedMesh.setFadeAt( id, fadeIn, fadeOut );
			batchedMesh.setVisibleAt( id, true );
			plugin.batchedMesh.setVisibleAt( id, false );

		} );

	} );

	// update the batched mesh fields
	if ( batchedMesh ) {

		const material = tiles.getPluginByName( 'BATCHED_TILES_PLUGIN' ).batchedMesh.material;
		batchedMesh.material.map = material.map;

	}

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
		this.batchedMesh = null;
		this._fadeManager = new FadeManager();
		this._fadeMaterialManager = new FadeMaterialManager();
		this._prevCameraTransforms = null;
		this._fadingOutCount = 0;

		this.maximumFadeOutTiles = options.maximumFadeOutTiles;
		this.fadeRootTiles = options.fadeRootTiles;
		this.fadeDuration = options.fadeDuration;

	}

	init( tiles ) {

		// event callback initialization
		this._onLoadModel = ( { scene } )=> {

			// initialize all the scene materials to fade
			this._fadeMaterialManager.prepareScene( scene );

		};
		this._onDisposeModel = ( { tile, scene } ) => {

			// delete the fade info from the managers on disposal of model
			this._fadeManager.deleteObject( tile );
			this._fadeMaterialManager.deleteScene( scene );

		};
		this._onAddCamera = ( { camera } ) => {

			// track the camera transform
			this._prevCameraTransforms.set( camera, new Matrix4() );

		};
		this._onDeleteCamera = ( { camera } )=> {

			// remove the camera transform
			this._prevCameraTransforms.delete( camera );

		};
		this._onTileVisibilityChange = ( { tile, visible } ) => {

			// this function gets fired _after_ all set visible callbacks including the batched meshes

			// revert the scene and fade to the initial state when toggling
			const scene = tile.cached.scene;
			if ( scene ) {

				scene.visible = true;

			}

			this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

				batchedMesh.setFadeAt( id, 0, 0 );
				batchedMesh.setVisibleAt( id, false );
				plugin.batchedMesh.setVisibleAt( id, false );

			} );

		};
		this._onUpdateBefore = () => {

			onUpdateBefore.call( this );

		};
		this._onUpdateAfter = () => {

			onUpdateAfter.call( this );

		};

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'add-camera', this._onAddCamera );
		tiles.addEventListener( 'delete-camera', this._onDeleteCamera );
		tiles.addEventListener( 'update-before', this._onUpdateBefore );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onTileVisibilityChange );

		// initialize fade manager
		const fadeManager = this._fadeManager;
		fadeManager.onFadeSetStart = () => {

			tiles.dispatchEvent( { type: 'fade-start' } );
			tiles.dispatchEvent( { type: 'force-rerender' } );

		};

		fadeManager.onFadeSetComplete = () => {

			tiles.dispatchEvent( { type: 'fade-end' } );
			tiles.dispatchEvent( { type: 'force-rerender' } );

		};

		fadeManager.onFadeComplete = ( tile, visible ) => {

			// mark the fade as finished and reset the fade parameters
			this._fadeMaterialManager.setFade( tile.cached.scene, 0, 0 );

			this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

				batchedMesh.setFadeAt( id, 0, 0 );
				batchedMesh.setVisibleAt( id, false );
				plugin.batchedMesh.setVisibleAt( id, visible );

			} );

			if ( ! visible ) {

				// now that the tile is hidden we can run the built-in setTileVisible function for the tile
				tiles.invokeOnePlugin( plugin => plugin !== this && plugin.setTileVisible && plugin.setTileVisible( tile, false ) );
				this._fadingOutCount --;

			}

		};

		// initialize the state based on what's already present
		const prevCameraTransforms = new Map();
		tiles.cameras.forEach( camera => {

			prevCameraTransforms.set( camera, new Matrix4() );

		} );

		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onLoadModel( { scene } );

		} );

		this.tiles = tiles;
		this._fadeManager = fadeManager;
		this._prevCameraTransforms = prevCameraTransforms;

	}

	// initializes the batched mesh if it needs to be, dispose if it it's no longer needed
	initBatchedMesh() {

		const otherBatchedMesh = this.tiles.getPluginByName( 'BATCHED_TILES_PLUGIN' )?.batchedMesh;
		if ( otherBatchedMesh ) {

			if ( this.batchedMesh === null ) {

				this._onBatchedMeshDispose = () => {

					this.batchedMesh.dispose();
					this.batchedMesh.removeFromParent();
					this.batchedMesh = null;
					otherBatchedMesh.removeEventListener( 'dispose', this._onBatchedMeshDispose );

				};

				const material = otherBatchedMesh.material.clone();
				material.onBeforeCompile = otherBatchedMesh.material.onBeforeCompile;

				this.batchedMesh = new FadeBatchedMesh( otherBatchedMesh, material );
				this.tiles.group.add( this.batchedMesh );

			}

		} else {

			if ( this.batchedMesh !== null ) {

				this._onBatchedMeshDispose();
				this._onBatchedMeshDispose = null;

			}

		}

	}

	// callback for fading to prevent tiles from being removed until the fade effect has completed
	setTileVisible( tile, visible ) {

		const fadeManager = this._fadeManager;

		// track the fade state
		const wasFading = fadeManager.isFading( tile );
		if ( fadeManager.isFadingOut( tile ) ) {

			this._fadingOutCount --;

		}

		// trigger any necessary fades
		if ( ! visible ) {

			this._fadingOutCount ++;
			fadeManager.fadeOut( tile );

		} else {

			// if this is a root renderable tile and this is the first time rendering in
			// then pop it in
			const isRootRenderableTile = tile.__depthFromRenderedParent === 1;
			if ( isRootRenderableTile ) {

				if ( tile[ HAS_POPPED_IN ] || this.fadeRootTiles ) {

					this._fadeManager.fadeIn( tile );

				}

				tile[ HAS_POPPED_IN ] = true;

			} else {

				this._fadeManager.fadeIn( tile );

			}

		}

		// if a tile was already fading then it's already marked as visible and in the scene
		if ( wasFading ) {

			return true;

		}

		// cancel the visibility change trigger because we're fading and will call this after
		// fade completes.
		const isFading = this._fadeManager.isFading( tile );
		if ( ! visible && isFading ) {

			return true;

		}

		return false;

	}

	dispose() {

		const tiles = this.tiles;

		this._fadeManager.completeAllFades();

		if ( this.batchedMesh !== null ) {

			this._onBatchedMeshDispose();

		}

		tiles.removeEventListener( 'load-model', this._onLoadModel );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		tiles.removeEventListener( 'add-camera', this._onAddCamera );
		tiles.removeEventListener( 'delete-camera', this._onDeleteCamera );
		tiles.removeEventListener( 'update-before', this._onUpdateBefore );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		tiles.removeEventListener( 'tile-visibility-change', this._onTileVisibilityChange );
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._fadeManager.deleteObject( tile );
			if ( scene ) {

				scene.visible = true; // TODO

			}

		} );

	}

	// helper for iterating over the batch ids for a given tile
	forEachBatchIds( tile, cb ) {

		this.initBatchedMesh();

		if ( this.batchedMesh ) {

			const batchedPlugin = this.tiles.getPluginByName( 'BATCHED_TILES_PLUGIN' );
			const instanceIds = batchedPlugin.getTileBatchIds( tile );
			if ( instanceIds ) {

				instanceIds.forEach( id => {

					cb( id, this.batchedMesh, batchedPlugin );

				} );

			}

		}

	}

}
