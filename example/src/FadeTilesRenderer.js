import { Group, Matrix4, Vector3, Quaternion } from 'three';
import { TilesRenderer } from '../../src/index.js';
import { FadeManager } from './FadeManager.js';

const _fromPos = new Vector3();
const _toPos = new Vector3();
const _fromQuat = new Quaternion();
const _toQuat = new Quaternion();
const _scale = new Vector3();

function onTileVisibilityChange( scene, tile, visible ) {

	// ensure the tiles are marked as visible on visibility toggle since
	// it's possible we disable them when adjusting visibility based on frustum
	scene.visible = true;

	if ( ! visible ) {

		this._fadeGroup.add( scene );
		this._fadeManager.fadeOut( scene );

	} else {

		// if this is a root tile and we haven't rendered any child tiles yet then pop in
		// the root tiles immediately rather than fading from nothing
		const isRootTile = tile.__depthFromRenderedParent === 0;
		if ( ! isRootTile ) {

			this.initialLayerRendered = true;

		}

		if ( ! isRootTile || this.fadeRootTiles || this.initialLayerRendered ) {

			this._fadeManager.fadeIn( scene );

		}

	}

}

function onLoadModel( scene, tile ) {

	this._fadeManager.prepareObject( scene );
	this._tileMap.set( scene, tile );

}

function onDisposeModel( scene ) {

	this._fadeManager.deleteObject( scene );

}

function onFadeComplete( object ) {

	// when the fade finishes ensure we dispose the tile and remove it from the fade group
	if ( object.parent === this._fadeGroup ) {

		this._fadeGroup.remove( object );

	}

}

export const FadeTilesRendererMixin = base => class extends base {

	get fadeDuration() {

		return this._fadeManager.duration;

	}

	set fadeDuration( value ) {

		this._fadeManager.duration = Number( value );

	}

	get fadingTiles() {

		return this._fadeManager.fadeCount;

	}

	constructor( ...args ) {

		super( ...args );

		this.maximumFadeOutTiles = 50;
		this.fadeRootTiles = false;

		const fadeGroup = new Group();
		const fadeManager = new FadeManager();
		fadeManager.onFadeSetStart = () => this.dispatchEvent( { type: 'fade-start' } );
		fadeManager.onFadeSetComplete = () => this.dispatchEvent( { type: 'fade-end' } );

		this.group.add( fadeGroup );
		fadeManager.onFadeComplete = onFadeComplete.bind( this );

		this._fadeManager = fadeManager;
		this._fadeGroup = fadeGroup;
		this._tileMap = new Map();

		this.addEventListener( 'load-model', e => onLoadModel.call( this, e.scene, e.tile ) );
		this.addEventListener( 'dispose-model', e => onDisposeModel.call( this, e.scene ) );
		this.addEventListener( 'tile-visibility-change', e => onTileVisibilityChange.call( this, e.scene, e.tile, e.visible ) );

		this.initialLayerRendered = false;
		this.prevCameraTransforms = new Map();

	}

	update( ...args ) {

		const displayActiveTiles = this.displayActiveTiles;
		const fadeManager = this._fadeManager;
		this.displayActiveTiles = true;

		// update the tiles
		const fadingBefore = fadeManager.fadeCount;

		super.update( ...args );
		fadeManager.update();

		const fadingAfter = fadeManager.fadeCount;
		if ( fadingBefore !== 0 && fadingAfter !== 0 ) {

			this.dispatchEvent( { type: 'fade-change' } );

		}

		this.displayActiveTiles = displayActiveTiles;

		// update the visibility of tiles based on visibility since we must use
		// the active tiles for rendering fade
		if ( ! displayActiveTiles ) {

			this.visibleTiles.forEach( t => {

				t.cached.scene.visible = t.__inFrustum;

			} );

		}

		const cameras = this.cameras;
		const prevCameraTransforms = this.prevCameraTransforms;
		if ( this.maximumFadeOutTiles < this._fadeGroup.children.length ) {

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

				this._fadeManager.completeAllFades();

			}

		}

		// track the camera movement so we can use it for next frame
		cameras.forEach( camera => {

			if ( ! prevCameraTransforms.has( camera ) ) {

				prevCameraTransforms.set( camera, new Matrix4() );

			}

			prevCameraTransforms.get( camera ).copy( camera.matrixWorld );

		} );

		const lruCache = this.lruCache;
		const tileMap = this._tileMap;
		fadeManager.forEachObject( scene => {

			lruCache.markUsed( tileMap.get( scene ) );

		} );

	}

	deleteCamera( camera ) {

		super.deleteCamera( camera );
		this.prevCameraTransforms.delete( camera );

	}

};

export const FadeTilesRenderer = FadeTilesRendererMixin( TilesRenderer );
