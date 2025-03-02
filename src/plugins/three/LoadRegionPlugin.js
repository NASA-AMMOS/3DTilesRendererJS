export class LoadRegionPlugin {

	constructor() {

		this.name = 'LOAD_REGION_PLUGIN';
		this.regions = [];
		this.tileErrors = new WeakMap();
		this.tiles = null;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	addRegion( region ) {

		if ( this.regions.indexOf( region ) === - 1 ) {

			this.regions.push( region );

		}

	}

	removeRegion( region ) {

		const index = this.regions.indexOf( region );
		if ( index !== - 1 ) {

			this.regions.splice( index, 1 );

		}

	}

	hasRegion( region ) {

		return this.regions.indexOf( region ) !== - 1;

	}

	clearRegions() {

		this.regions = [];

	}

	tileInView( tile ) {

		const boundingVolume = tile.cached.boundingVolume;
		const { regions, tileErrors, tiles } = this;

		let visible = false;
		let error = Infinity;
		for ( const region of regions ) {

			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			if ( intersects ) {

				visible = true;
				error = Math.min( region.calculateError( tile, tiles ) );

			}

		}

		if ( visible ) {

			tileErrors.set( tile, error );

		}

		return visible;

	}

	calculateError( tile ) {

		return this.tileErrors.has( tile ) ? this.tileErrors.get( tile ) : null;

	}

	dispose() {

		this.regions = [];

	}

}
