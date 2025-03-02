import { Matrix4 } from 'three';

const _mat = new Matrix4().identity();
const _matInv = new Matrix4().identity();

export class LoadRegionPlugin {

	constructor() {

		this.name = 'REGION_TILES_LOADING_PLUGIN';
		this.regions = [];

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

		if ( this.regions.length > 0 && ! _mat.equals( this.tiles.group.matrixWorld ) ) {

			_mat.copy( this.tiles.group.matrixWorld );
			_matInv.copy( this.tiles.group.matrixWorld ).invert();

		}

		tile.__inRegion = false;
		tile.__regionCustomCalculateErrorFunctions = [];

		for ( const region of this.regions ) {

			const intersects = region.intersectsTile.bind( region )( boundingVolume, tile, _matInv );
			if ( intersects ) {

				tile.__inRegion = true;
				tile.__regionCustomCalculateErrorFunctions.push( region.calculateError.bind( region ) );

			}

		}

		return false;

	}

	calculateError( tile ) {

		if ( tile.__inRegion ) {

			let maxError = - Infinity;

			for ( const fn of tile.__regionCustomCalculateErrorFunctions ) {

				maxError = Math.max( maxError, fn( tile, this.tiles.errorTarget ) );

			}
			return maxError;

		}

	}

	dispose() {

		this.regions = [];

	}

}
