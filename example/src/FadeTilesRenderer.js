import { Group } from 'three';
import { TilesRenderer } from '../..';
import { FadeManager } from './FadeManager.js';

function onTileVisibilityChange( scene, tile, visible ) {

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

		this.disposeSet = new Set();

	}

	update( ...args ) {

		super.update( ...args );
		this._fadeManager.update();

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
