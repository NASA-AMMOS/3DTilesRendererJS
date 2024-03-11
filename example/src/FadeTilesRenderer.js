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

function onLoadModel( scene ) {

	this._fadeManager.prepareObject( scene );

}

function onFadeComplete( object ) {

	// when the fade finishes ensure we dispose the tile and remove it from the fade group
	if ( object.parent === this._fadeGroup ) {

		this._fadeGroup.remove( object );

		// TODO: this is basically duplicating all disposal logic from TilesRenderer disposeTile. Would be best to not duplicate this.
		if ( this.disposeSet.has( object ) ) {

			const info = this.disposeSet.get( object );
			const materials = info.materials;
			const geometry = info.geometry;
			const textures = info.textures;
			const parent = info.scene.parent;
			const tile = info.tile;

			for ( let i = 0, l = geometry.length; i < l; i ++ ) {

				geometry[ i ].dispose();

			}

			for ( let i = 0, l = materials.length; i < l; i ++ ) {

				materials[ i ].dispose();

			}

			for ( let i = 0, l = textures.length; i < l; i ++ ) {

				const texture = textures[ i ];

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

				texture.dispose();

			}

			if ( parent ) {

				parent.remove( info.scene );

			}

			this.dispatchEvent( {
				type: 'dispose-model',
				scene: info.scene,
				tile,
			} );

			if ( this.onDisposeModel ) {

				this.onDisposeModel( info.scene, tile );

			}

		}

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

		this.addEventListener( 'load-model', e => onLoadModel.call( this, e.scene ) );
		this.addEventListener( 'tile-visibility-change', e => onTileVisibilityChange.call( this, e.scene, e.tile, e.visible ) );

		this.initialLayerRendered = false;
		this.prevCameraTransforms = new Map();
		this.disposeSet = new Map();

	}

	update( ...args ) {

		const displayActiveTiles = this.displayActiveTiles;
		this.displayActiveTiles = true;

		// update the tiles
		const fadingBefore = this._fadeManager.fadeCount;

		super.update( ...args );
		this._fadeManager.update();

		const fadingAfter = this._fadeManager.fadeCount;
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


	}

	deleteCamera( camera ) {

		super.deleteCamera( camera );
		this.prevCameraTransforms.delete( camera );

	}

	disposeTile( tile ) {

		// When a tile is disposed we keep it around if it's currently fading out and mark it for disposal later
		const scene = tile.cached.scene;
		if ( scene && scene.parent === this._fadeGroup ) {

			const cached = tile.cached;
			this.disposeSet.set( scene, { tile, ...cached } );

			// TODO: duplicating logic from TilesRenderer disposeTile
			cached.scene = null;
			cached.materials = null;
			cached.textures = null;
			cached.geometry = null;
			cached.metadata = null;

			this.activeTiles.delete( tile );
			this.visibleTiles.delete( tile );
			tile._loadIndex ++;

		} else {

			super.disposeTile( tile );
			this._fadeManager.deleteObject( scene );

		}

	}

	dispose() {

		super.dispose();

		this.disposeSet.forEach( object => {

			onFadeComplete.call( this, object );

		} );

	}

};

export const FadeTilesRenderer = FadeTilesRendererMixin( TilesRenderer );
