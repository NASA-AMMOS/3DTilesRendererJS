import { Ray, Sphere } from 'three';
import { OBB } from '../../three/renderer/math/OBB.js';

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

	// Calculates shape intersections and associated error values to use. If "mask" shapes are present then
	// tiles are only loaded if they are within those shapes.
	calculateTileViewError( tile, target ) {

		const boundingVolume = tile.cached.boundingVolume;
		const { regions, tiles } = this;

		let inShape = false;
		let inMask = null;
		let maxError = - Infinity;
		for ( const region of regions ) {

			// Check if the tile is intersecting the shape and calculate the
			// view and error values.
			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			inShape = inShape || intersects;
			maxError = Math.max( region.calculateError( tile, tiles ), maxError );

			// Store whether the tile is in a "mask" shape if they exist. If "inMask" is
			// still "null" by the end of the loop then there are no mask elements.
			if ( region.mask ) {

				inMask = inMask || intersects;

			}

		}

		// A tile should only be visible if it intersects a shape and a mask shape or there
		// are no masks.
		target.inView = inShape && inMask !== false;
		target.error = maxError;

		// Returning "false" indicates "no operation" and all results will be ignored.
		return target.inView || inMask !== null;

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
