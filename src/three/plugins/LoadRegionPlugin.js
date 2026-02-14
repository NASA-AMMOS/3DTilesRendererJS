import { Ray, Sphere } from 'three';
import { OBB } from '3d-tiles-renderer/three';

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

		const boundingVolume = tile.engineData.boundingVolume;
		const { regions, tiles } = this;

		// "inShape" indicates whether the tile intersects the given shape.
		// "inMask" indicates whether the tile is _within_ a mask if boolean, if
		// null then it is ignored.
		// "maxError" is the maximum error from the shapes.
		let inShape = false;
		let inMask = null;
		let maxError = 0;
		let minDistance = Infinity;
		for ( const region of regions ) {

			// TODO: we should only set the error if it is "intersected".

			// Check if the tile is intersecting the shape and calculate the
			// view and error values.
			const intersects = region.intersectsTile( boundingVolume, tile, tiles );
			inShape = inShape || intersects;

			if ( intersects ) {

				maxError = Math.max( region.calculateError( tile, tiles ), maxError );
				minDistance = Math.min( region.calculateDistance( boundingVolume, tile, tiles ), minDistance );

			}

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
		target.distance = minDistance;

		// Returning "false" indicates "no operation" and all results will be ignored.
		return target.inView || inMask !== null;

	}

	dispose() {

		this.regions = [];

	}

}

// Definitions of predefined regions
export class BaseRegion {

	constructor( options = {} ) {

		if ( typeof options === 'number' ) {

			console.warn( 'LoadRegionPlugin: Region constructor has been changed to take options as an object.' );
			options = { errorTarget: options };

		}

		const {
			errorTarget = 10,
			mask = false,
		} = options;

		this.errorTarget = errorTarget;
		this.mask = mask;

	}

	intersectsTile( boundingVolume, tile, tiles ) {

		return false;

	}

	calculateDistance( boundingVolume, tile, tiles ) {

		return Infinity;

	}

	calculateError( tile, tilesRenderer ) {

		return tile.geometricError - this.errorTarget + tilesRenderer.errorTarget;

	}

}

export class SphereRegion extends BaseRegion {

	constructor( options = {} ) {

		if ( typeof options === 'number' ) {

			console.warn( 'SphereRegion: Region constructor has been changed to take options as an object.' );
			options = {
				errorTarget: arguments[ 0 ],
				sphere: arguments[ 1 ],
			};

		}

		const { sphere = new Sphere() } = options;

		super( options );
		this.sphere = sphere.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsSphere( this.sphere );

	}

}

export class RayRegion extends BaseRegion {

	constructor( options = {} ) {

		if ( typeof options === 'number' ) {

			console.warn( 'RayRegion: Region constructor has been changed to take options as an object.' );
			options = {
				errorTarget: arguments[ 0 ],
				ray: arguments[ 1 ],
			};

		}

		const { ray = new Ray() } = options;

		super( options );
		this.ray = ray.clone();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsRay( this.ray );

	}

}

export class OBBRegion extends BaseRegion {

	constructor( options = {} ) {

		if ( typeof options === 'number' ) {

			console.warn( 'RayRegion: Region constructor has been changed to take options as an object.' );
			options = {
				errorTarget: arguments[ 0 ],
				obb: arguments[ 1 ],
			};

		}

		const { obb = new OBB() } = options;

		super( options );
		this.obb = obb.clone();
		this.obb.update();

	}

	intersectsTile( boundingVolume ) {

		return boundingVolume.intersectsOBB( this.obb );

	}

}
