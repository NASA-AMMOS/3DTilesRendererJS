import { Group, Matrix4, Vector3, Quaternion } from 'three';
import { TilesRenderer } from '../..';
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

		this._fadeManager.fadeIn( scene );

	}

}

function onLoadModel( scene ) {

	this._fadeManager.prepareObject( scene );

}

function onFadeFinish( object ) {

	// when the fade finishes ensure we dispose the tile and remove it from the fade group
	if ( object.parent === this._fadeGroup ) {

		this._fadeGroup.remove( object );

		if ( this.disposeSet.has( object ) ) {

			// TODO: a lot of this is basically redundant to the TilesRenderer.disposeTile code
			this._fadeManager.deleteObject( object );
			object.traverse( child => {

				const { geometry, material } = child;
				if ( geometry ) {

					geometry.dispose();

				}

				if ( material ) {

					material.dispose();
					for ( const key in material ) {

						const value = material[ key ];
						if ( value && value.dispose && typeof value.dispose === 'function' ) {

							value.dispose();

						}

					}

				}

			} );

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

	constructor( ...args ) {

		super( ...args );

		this.maximumFadeOutTiles = 50;

		const fadeGroup = new Group();
		const fadeManager = new FadeManager();
		this.group.add( fadeGroup );
		fadeManager.onFadeFinish = onFadeFinish.bind( this );

		this._fadeManager = fadeManager;
		this._fadeGroup = fadeGroup;

		this.onLoadModel = onLoadModel.bind( this );
		this.onTileVisibilityChange = onTileVisibilityChange.bind( this );

		this.prevCameraTransforms = new Map();
		this.disposeSet = new Set();

	}

	update( ...args ) {

		// adjust settings to what's needed for specific fade logic. Ie display active tiles so when the camera
		// moves we don't notice tiles popping when they enter the view. And perform the fade animation more quickly
		// if the camera is moving quickly.
		const fadeDuration = this.fadeDuration;
		const displayActiveTiles = this.displayActiveTiles;
		this.displayActiveTiles = true;

		// update the tiles
		super.update( ...args );
		this._fadeManager.update();

		this.displayActiveTiles = displayActiveTiles;
		this.fadeDuration = fadeDuration;

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

		this.prevCameraTransforms.delete( camera );

	}

	disposeTile( tile ) {

		// When a tile is disposed we keep it around if it's currently fading out and mark it for disposal later
		const scene = tile.cached.scene;
		if ( scene && scene.parent === this._fadeGroup ) {

			this.disposeSet.add( scene );
			super.disposeTile( tile );
			this._fadeGroup.add( scene );

		} else {

			super.disposeTile( tile );
			this._fadeManager.deleteObject( scene );

		}

	}

	dispose() {

		super.dispose();

		this.disposeSet.forEach( object => {

			onFadeFinish.call( this, object );

		} );

	}

};

export const FadeTilesRenderer = FadeTilesRendererMixin( TilesRenderer );
