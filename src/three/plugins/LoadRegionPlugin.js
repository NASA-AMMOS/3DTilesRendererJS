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

	/**
	 * Returns:
	 * - true if the tile intersects at least one region (tile shall be traversed)
	 * - false if the tile doesn't intersect any region (tile will still be rendered if it's in camera frustum)
	 * - null if the tile doesn't intersect any region and all regions have "mask=true" (tile won't be rendered even if it's in the camera frustum)
	 */
	calculateTileViewError( tile, target ) {

		const boundingVolume = tile.cached.boundingVolume;
		const { regions, tiles } = this;

		let inView = false;
		let inViewError = - Infinity;
		let maxError = - Infinity;
		for ( const region of regions ) {

			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			if ( intersects ) {

				inView = true;
				inViewError = Math.max( region.calculateError( tile, tiles ), inViewError );

			} else if ( region.mask ) {

				inView = null || inView; // NB: Watch out with null value in booleans; OR operator in JS returns last value if all are falsy, so operand order is important.

			} else {

				inView = inView || false; // NB: Watch out with null value in booleans; OR operator in JS returns last value if all are falsy, so operand order is important.

			}

			maxError = Math.max( region.calculateError( tile, tiles ), maxError );

		}

		target.inView = inView;
		target.error = inView ? inViewError : maxError;

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
