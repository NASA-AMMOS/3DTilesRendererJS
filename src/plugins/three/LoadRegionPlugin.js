import { Ray, Sphere } from 'three';
import { OBB } from '../../three/math/OBB.js';

export class LoadRegionPlugin {

	constructor() {

		this.name = 'LOAD_REGION_PLUGIN';
		this.regions = [];
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

	calculateTileViewError( tile, target ) {

		const boundingVolume = tile.cached.boundingVolume;
		const { regions, tiles } = this;

		let visible = false;
		let maxError = - Infinity;
		for ( const region of regions ) {

			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			if ( intersects ) {

				visible = true;
				maxError = Math.max( region.calculateError( tile, tiles ), maxError );

			}

		}

		target.inView = visible;
		target.error = maxError;

	}

	dispose() {

		this.regions = [];

	}

}

// Definitions of predefined regions
class BaseRegion {

	constructor( errorTarget = 10 ) {

		this.errorTarget = errorTarget;

	}

	intersectsTile() {}

	calculateError( tile, tilesRenderer ) {

		return tile.geometricError - this.errorTarget + tilesRenderer.errorTarget;

	}

}

export class SphereRegion extends BaseRegion {

	constructor( errorTarget = 10, sphere = new Sphere() ) {

		super( errorTarget );
		this.sphere = sphere.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsSphere( this.sphere );

	}

}

export class RayRegion extends BaseRegion {

	constructor( errorTarget = 10, ray = new Ray() ) {

		super( errorTarget );
		this.ray = ray.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsRay( this.ray );

	}

}

export class OBBRegion extends BaseRegion {

	constructor( errorTarget = 10, obb = new OBB() ) {

		super( errorTarget );
		this.obb = obb.clone();
		this.obb.update();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsOBB( this.obb );

	}

}
