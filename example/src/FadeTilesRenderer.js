import { Group, Matrix4, Vector3, Quaternion } from 'three';
import { TilesRenderer } from '../..';
import { FadeManager } from './FadeManager.js';

function onTileVisibilityChange( scene, tile, visible ) {

	scene.visible = true;

	if ( this.isMovingFast ) {

		this._fadeManager.completeFade( scene );
		return;

	}

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

	if ( object.parent === this._fadeGroup ) {

		this._fadeGroup.remove( object );

		if ( this.disposeSet.has( object ) ) {

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

		const fadeGroup = new Group();
		this.group.add( fadeGroup );

		const fadeManager = new FadeManager();
		fadeManager.onFadeFinish = onFadeFinish.bind( this );

		this._fadeManager = fadeManager;
		this._fadeGroup = fadeGroup;

		this.onLoadModel = onLoadModel.bind( this );
		this.onTileVisibilityChange = onTileVisibilityChange.bind( this );

		this.prevCameraTransform = new Map();
		this.disposeSet = new Set();

	}

	update( ...args ) {


		const fromPos = new Vector3();
		const toPos = new Vector3();
		const fromQuat = new Quaternion();
		const toQuat = new Quaternion();
		const scale = new Vector3();

		let isMovingFast = true;
		const prevCameraTransform = this.prevCameraTransform;
		this.cameras.forEach( camera => {

			if ( ! prevCameraTransform.has( camera ) ) {

				return;

			}

			const currMatrix = camera.matrixWorld;
			const prevMatrix = prevCameraTransform.get( camera );

			currMatrix.decompose( toPos, toQuat, scale );
			prevMatrix.decompose( fromPos, fromQuat, scale );

			const angleTo = toQuat.angleTo( fromQuat );
			const positionTo = toPos.distanceTo( fromPos );

			isMovingFast = isMovingFast && ( angleTo > 0.25 || positionTo > 0.1 );

		} );

		const fadeDuration = this.fadeDuration;
		const displayActiveTiles = this.displayActiveTiles;
		this.displayActiveTiles = true;
		this.fadeDuration = isMovingFast ? fadeDuration * 0.2 : fadeDuration;
		this.isMovingFast = isMovingFast;

		super.update( ...args );
		this._fadeManager.update();

		this.displayActiveTiles = displayActiveTiles;
		this.fadeDuration = fadeDuration;

		if ( ! displayActiveTiles ) {

			// update the visibility of tiles based on visibility since we must use
			// the active tiles for rendering fade
			this.visibleTiles.forEach( t => {

				t.cached.scene.visible = t.__inFrustum;

			} );

		}

		// track the camera movement
		this.cameras.forEach( camera => {

			if ( ! prevCameraTransform.has( camera ) ) {

				prevCameraTransform.set( camera, new Matrix4() );

			}

			prevCameraTransform.get( camera ).copy( camera.matrixWorld );

		} );

	}

	deleteCamera( camera ) {

		this.prevCameraTransform.delete( camera );

	}

	disposeTile( tile ) {

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

};

export const FadeTilesRenderer = FadeTilesRendererMixin( TilesRenderer );
