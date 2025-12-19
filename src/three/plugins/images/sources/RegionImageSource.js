import { TiledTextureComposer } from '../overlays/TiledTextureComposer.js';
import { forEachTileInBounds } from '../overlays/utils.js';
import { DataCache } from '../utils/DataCache.js';
import { SRGBColorSpace, CanvasTexture } from 'three';

export class RegionImageSource extends DataCache {}

// TODO: how to handle updates to the textures for frames, reload, changing?
// TODO: how to get the texture before it's been drawn?
// TODO: how can we avoid adding "tileComposer" here?
export class TiledRegionImageSource extends RegionImageSource {

	constructor( tiledImageSource ) {

		super();
		this.tiledImageSource = tiledImageSource;
		this.tileComposer = new TiledTextureComposer();
		this.resolution = 256;

	}

	async fetchItem( [ minX, minY, maxX, maxY, level ], signal ) {

		const range = [ minX, minY, maxX, maxY ];
		const imageSource = this.tiledImageSource;
		const tiling = imageSource.tiling;
		const tileComposer = this.tileComposer;

		const canvas = document.createElement( 'canvas' );
		canvas.width = this.resolution;
		canvas.height = this.resolution;

		const target = new CanvasTexture( canvas );
		target.colorSpace = SRGBColorSpace;
		target.generateMipmaps = false;
		target.tokens = [ ...range, level ];

		// Start locking tiles for the requested level
		const promise = this._markImages( range, level, false );

		// Progressive loading: if tiles aren't ready yet, draw previous level as placeholder
		if ( promise ) {

			tileComposer.setTarget( target, range );
			tileComposer.clear( 0xffffff, 0 );

			// Draw previous level tiles that are already available
			if ( level > 0 ) {

				forEachTileInBounds( range, level - 1, tiling, ( tx, ty, tl ) => {

					const span = tiling.getTileBounds( tx, ty, tl, true, false );
					const tex = imageSource.get( tx, ty, tl );
					if ( tex && ! ( tex instanceof Promise ) ) {

						tileComposer.draw( tex, span );

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
		tileComposer.setTarget( target, range );
		tileComposer.clear( 0xffffff, 0 );

		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			// draw using normalized bounds since the mercator bounds are non-linear
			const span = tiling.getTileBounds( tx, ty, tl, true, false );
			const tex = imageSource.get( tx, ty, tl );
			tileComposer.draw( tex, span );

		} );


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

}
