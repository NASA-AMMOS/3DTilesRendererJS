import { Ray, Sphere } from 'three';
import { OBB } from '../../three/renderer/math/OBB.js';

export class LoadRegionPlugin {

	constructor() {

		this.name = 'LOAD_REGION_PLUGIN';
		this.priority = - 1000;
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

		let mask = false;
		let visible = false;
		let maxError = - Infinity;
		for ( const region of regions ) {

			if ( region.mask ) {

				mask = true;

			}

			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			if ( intersects ) {

				visible = true;
				maxError = Math.max( region.calculateError( tile, tiles ), maxError );

			}

		}

		target.inView = visible;
		target.error = maxError;

		return ( ( ! visible && mask ) ? false : null ); // Returns false if should force mask the tile.

	}

	raycastTile( tile, scene, raycaster, intersects ) {

		return ! tile.__inFrustum;

	}

	dispose() {

		this.regions = [];

	}

}

// Definitions of predefined regions
export class BaseRegion {

	constructor( errorTarget = 10, mask = false ) {

		this.errorTarget = errorTarget;
		this.mask = mask;

	}

	intersectsTile() {}

	calculateError( tile, tilesRenderer ) {

		return tile.geometricError - this.errorTarget + tilesRenderer.errorTarget;

	}

}

export class SphereRegion extends BaseRegion {

	constructor( errorTarget = 10, mask = false, sphere = new Sphere() ) {

		super( errorTarget, mask );
		this.sphere = sphere.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsSphere( this.sphere );

	}

}

export class RayRegion extends BaseRegion {

	constructor( errorTarget = 10, mask = false, ray = new Ray() ) {

		super( errorTarget, mask );
		this.ray = ray.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsRay( this.ray );

	}

}

export class OBBRegion extends BaseRegion {

	constructor( errorTarget = 10, mask = false, obb = new OBB() ) {

		super( errorTarget, mask );
		this.obb = obb.clone();
		this.obb.update();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsOBB( this.obb );

	}

}
