import { Ray, Sphere } from 'three';
import { OBB } from '../../three/math/OBB.js';

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

	intersectsTile( boundingVolume, tile ) {

		return boundingVolume.intersectsRay( this.ray );

	}

}

export class OBBRegion extends BaseRegion {

	constructor( errorTarget = 10, obb = new OBB() ) {

		super( errorTarget );
		this.obb = obb.clone();

	}

	intersectsTile( boundingVolume, tile ) {

		return boundingVolume.intersectsOBB( this.obb );

	}

}
