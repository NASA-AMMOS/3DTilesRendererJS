import { forEachTileInBounds } from '../overlays/utils.js';
import { DataCache } from '../utils/DataCache.js';
import { WebGLRenderTarget, SRGBColorSpace } from 'three';

export class RegionImageSource extends DataCache {}

// TODO: how to handle updates to the textures for frames, reload, changing?
// TODO: how to get the texture before it's been drawn?
// TODO: how can we avoid adding "tileComposer" here?
export class TiledRegionImageSource extends RegionImageSource {

	constructor( tiledImageSource ) {

		super();
		this.tiledImageSource = tiledImageSource;
		this.tileComposer = null;
		this.resolution = 256;
		this.usedTextures = new Set();

	}

	async fetchItem( [ minX, minY, maxX, maxY, level ], signal ) {

		const range = [ minX, minY, maxX, maxY ];
		const imageSource = this.tiledImageSource;
		const tiling = imageSource.tiling;
		const tileComposer = this.tileComposer;
		const usedTextures = this.usedTextures;

		const target = new WebGLRenderTarget( this.resolution, this.resolution, {
			depthBuffer: false,
			stencilBuffer: false,
			generateMipmaps: false,
			colorSpace: SRGBColorSpace,
		} );
		target.tokens = [ ...range, level ];

		// Start locking tiles for the requested level
		const promise = this._markImages( range, level, false );

		// Progressive loading: if tiles aren't ready yet, draw previous level as placeholder
		if ( promise ) {

			tileComposer.setRenderTarget( target, range );
			tileComposer.clear( 0xffffff, 0 );

			// Draw previous level tiles that are already available
			if ( level > 0 ) {

				forEachTileInBounds( range, level - 1, tiling, ( tx, ty, tl ) => {

					const span = tiling.getTileBounds( tx, ty, tl, true, false );
					const tex = imageSource.get( tx, ty, tl );
					if ( tex && ! ( tex instanceof Promise ) ) {

						tileComposer.draw( tex, span );
						usedTextures.add( tex );

					}

				} );

			}

			// Wait for current level tiles to load
			await promise;

			if ( signal.aborted ) {

				return null;

			}

		}

		// Draw the requested level tiles
		tileComposer.setRenderTarget( target, range );
		tileComposer.clear( 0xffffff, 0 );

		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			// draw using normalized bounds since the mercator bounds are non-linear
			const span = tiling.getTileBounds( tx, ty, tl, true, false );
			const tex = imageSource.get( tx, ty, tl );
			tileComposer.draw( tex, span );
			usedTextures.add( tex );

		} );

		this._scheduleCleanup();

		return target;

	}

	disposeItem( target ) {

		target.dispose();

		// Unlock the component tiles using the tokens stored on the target
		const [ minX, minY, maxX, maxY, level ] = target.tokens;
		this._markImages( [ minX, minY, maxX, maxY ], level, true );

	}

	dispose() {

		super.dispose();
		this.tiledImageSource.dispose();

		if ( this.tileComposer ) {

			this.tileComposer.dispose();

		}

	}

	_markImages( range, level, release = false ) {

		// TODO: can we get rid of "planar projection"?
		const imageSource = this.tiledImageSource;
		const tiling = imageSource.tiling;

		const promises = [];
		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			if ( release ) {

				imageSource.release( tx, ty, tl );

			} else {

				promises.push( imageSource.lock( tx, ty, tl ) );

			}

		} );

		const filteredPromises = promises.filter( p => p instanceof Promise );
		if ( filteredPromises.length !== 0 ) {

			return Promise.all( filteredPromises );

		} else {

			return null;

		}

	}

	_scheduleCleanup() {

		// clean up textures used for drawing the tile overlays
		if ( ! this._cleanupScheduled ) {

			this._cleanupScheduled = true;
			requestAnimationFrame( () => {

				const { usedTextures } = this;
				usedTextures.forEach( tex => {

					tex.dispose();

				} );

				usedTextures.clear();
				this._cleanupScheduled = false;

			} );

		}

	}

}
