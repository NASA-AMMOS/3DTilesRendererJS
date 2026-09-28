import { Matrix4, Vector3, Quaternion } from 'three';
import { TilesFadePluginBase } from '../../../core/plugins/fade/TilesFadePluginBase.js';
import { FadeMaterialManager } from './FadeMaterialManager.js';
import { FadeBatchedMesh } from './FadeBatchedMesh.js';

const _fromPos = /* @__PURE__ */ new Vector3();
const _toPos = /* @__PURE__ */ new Vector3();
const _fromQuat = /* @__PURE__ */ new Quaternion();
const _toQuat = /* @__PURE__ */ new Quaternion();
const _scale = /* @__PURE__ */ new Vector3();

/**
 * Plugin that overrides material shaders to fade tile geometry in and out as tile LODs
 * change, preventing pop-in. Dispatches `fade-change`, `fade-start`, and `fade-end`
 * events on the `TilesRenderer` during animation — use these when doing on-demand
 * rendering. Works alongside `BatchedTilesPlugin` when present.
 * @param {Object} [options]
 * @param {number} [options.fadeDuration=250] Time in milliseconds for a tile to fully fade in or out.
 * @param {number} [options.maximumFadeOutTiles=50] Maximum simultaneous fade-out tiles. If exceeded, tiles pop instead of fading.
 * @param {boolean} [options.fadeRootTiles=false] Whether root-level tiles fade in on their first appearance.
 */
export class TilesFadePlugin extends TilesFadePluginBase {

	constructor( options ) {

		super( options );
		this.batchedMesh = null;
		this._fadeMaterialManager = new FadeMaterialManager();
		this._prevCameraTransforms = null;

	}

	init( tiles ) {

		this._prevCameraTransforms = new Map();
		tiles.cameras.forEach( camera => {

			this._prevCameraTransforms.set( camera, new Matrix4() );

		} );

		super.init( tiles );

		this._onAddCamera = ( { camera } ) => {

			this._prevCameraTransforms.set( camera, new Matrix4() );

		};

		this._onDeleteCamera = ( { camera } ) => {

			this._prevCameraTransforms.delete( camera );

		};

		this._onTileVisibilityChange = ( { tile } ) => {

			this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

				batchedMesh.setFadeAt( id, 0, 0 );
				batchedMesh.setVisibleAt( id, false );
				plugin.batchedMesh.setVisibleAt( id, false );

			} );

		};

		tiles.addEventListener( 'add-camera', this._onAddCamera );
		tiles.addEventListener( 'delete-camera', this._onDeleteCamera );
		tiles.addEventListener( 'tile-visibility-change', this._onTileVisibilityChange );

	}

	prepareTileScene( scene ) {

		this._fadeMaterialManager.prepareScene( scene );

	}

	releaseTileScene( scene ) {

		this._fadeMaterialManager.deleteScene( scene );

	}

	setFadeState( tile, fadeIn, fadeOut ) {

		const scene = tile.engineData?.scene;
		if ( scene ) {

			this._fadeMaterialManager.setFade( scene, fadeIn, fadeOut );

		}

		this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

			batchedMesh.setFadeAt( id, fadeIn, fadeOut );
			batchedMesh.setVisibleAt( id, true );
			plugin.batchedMesh.setVisibleAt( id, false );

		} );

	}

	resetFadeState( tile, visible ) {

		this._fadeMaterialManager.setFade( tile.engineData?.scene, 0, 0 );
		this.forEachBatchIds( tile, ( id, batchedMesh, plugin ) => {

			batchedMesh.setFadeAt( id, 0, 0 );
			batchedMesh.setVisibleAt( id, false );
			plugin.batchedMesh.setVisibleAt( id, visible );

		} );

	}

	updateCameraState( checkMovement ) {

		const { cameras } = this.tiles;
		const prevCameraTransforms = this._prevCameraTransforms;
		let isMovingFast = true;

		if ( checkMovement ) {

			cameras.forEach( camera => {

				if ( ! prevCameraTransforms.has( camera ) ) {

					return;

				}

				const currMatrix = camera.matrixWorld;
				const prevMatrix = prevCameraTransforms.get( camera );
				currMatrix.decompose( _toPos, _toQuat, _scale );
				prevMatrix.decompose( _fromPos, _fromQuat, _scale );

				isMovingFast = isMovingFast &&
					( _toQuat.angleTo( _fromQuat ) > 0.25 || _toPos.distanceTo( _fromPos ) > 0.1 );

			} );

		}

		cameras.forEach( camera => {

			prevCameraTransforms.get( camera ).copy( camera.matrixWorld );

		} );

		return isMovingFast;

	}

	_updateAfter() {

		super._updateAfter();

		if ( this.batchedMesh ) {

			const material = this.tiles.getPluginByName( 'BATCHED_TILES_PLUGIN' ).batchedMesh.material;
			this.batchedMesh.material.map = material.map;

		}

	}

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

		} else if ( this.batchedMesh !== null ) {

			this._onBatchedMeshDispose();
			this._onBatchedMeshDispose = null;

		}

	}

	dispose() {

		const tiles = this.tiles;
		super.dispose();

		if ( this.batchedMesh !== null ) {

			this._onBatchedMeshDispose();

		}

		tiles.removeEventListener( 'add-camera', this._onAddCamera );
		tiles.removeEventListener( 'delete-camera', this._onDeleteCamera );
		tiles.removeEventListener( 'tile-visibility-change', this._onTileVisibilityChange );
		this._prevCameraTransforms = null;

	}

	forEachBatchIds( tile, callback ) {

		this.initBatchedMesh();

		if ( this.batchedMesh ) {

			const batchedPlugin = this.tiles.getPluginByName( 'BATCHED_TILES_PLUGIN' );
			const instanceIds = batchedPlugin.getTileBatchIds( tile );
			if ( instanceIds ) {

				instanceIds.forEach( id => callback( id, this.batchedMesh, batchedPlugin ) );

			}

		}

	}

}
