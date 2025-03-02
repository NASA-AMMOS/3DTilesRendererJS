import { Sphere, Ray, Matrix4 } from 'three';
import { SphereRegion } from './intersects/SphereRegion';
import { RayRegion } from './intersects/RayRegion';
import { OBBRegion } from './intersects/OBBRegion';
import { OBB } from '../../three/math/OBB';

const _mat = new Matrix4().identity();
const _matInv = new Matrix4().identity();
const sphereRegion = new SphereRegion( new Sphere() );
const rayRegion = new RayRegion( new Ray() );
const obbRegion = new OBBRegion( new OBB() );

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
		tile.regionErrorTarget = Infinity;

		for ( const region of this.regions ) {

			if ( region.intersectsTile ) {

				const intersects = region.intersectsTile( boundingVolume, tile, _matInv );
				if ( intersects ) {

					tile.__inRegion = true;
					tile.regionErrorTarget = Math.min( tile.regionErrorTarget, region.errorTarget );
					if ( region.calculateError ) {

						if ( ! tile.__regionCustomCalculateErrorFunctions ) tile.__regionCustomCalculateErrorFunctions = [];
						tile.__regionCustomCalculateErrorFunctions.push( region.calculateError );

					}

				}

			} else if ( region.shape instanceof Sphere ) {

				sphereRegion.sphere.copy( region.shape );

				if ( sphereRegion.intersectsTile( boundingVolume, _matInv ) ) {

					tile.__inRegion = true;
					tile.regionErrorTarget = Math.min( tile.regionErrorTarget, region.errorTarget );
					if ( region.calculateError ) {

						if ( ! tile.__regionCustomCalculateErrorFunctions ) tile.__regionCustomCalculateErrorFunctions = [];
						tile.__regionCustomCalculateErrorFunctions.push( region.calculateError );

					}

				}

			} else if ( region.shape instanceof Ray ) {

				rayRegion.ray.copy( region.shape );

				if ( rayRegion.intersectsTile( boundingVolume, _matInv ) ) {

					tile.__inRegion = true;
					tile.regionErrorTarget = Math.min( tile.regionErrorTarget, region.errorTarget );
					if ( region.calculateError ) {

						if ( ! tile.__regionCustomCalculateErrorFunctions ) tile.__regionCustomCalculateErrorFunctions = [];
						tile.__regionCustomCalculateErrorFunctions.push( region.calculateError );

					}

				}

			} else if ( region.shape instanceof OBB ) {

				obbRegion.obb.box.copy( region.shape.box );
				obbRegion.obb.transform.copy( region.shape.transform );


				if ( obbRegion.intersectsTile( boundingVolume, _matInv ) ) {

					tile.__inRegion = true;
					tile.regionErrorTarget = Math.min( tile.regionErrorTarget, region.errorTarget );
					if ( region.calculateError ) {

						if ( ! tile.__regionCustomCalculateErrorFunctions ) tile.__regionCustomCalculateErrorFunctions = [];
						tile.__regionCustomCalculateErrorFunctions.push( region.calculateError );

					}

				}

			}

		}

		return false;

	}

	calculateError( tile ) {

		if ( tile.__inRegion ) {

			let error = 0;
			if ( tile.__regionCustomCalculateErrorFunctions ) {

				for ( const fn of tile.__regionCustomCalculateErrorFunctions ) {

					error = Math.max( error, fn( tile ) );

				}

			}
			error = Math.max( error, tile.geometricError - tile.regionErrorTarget + this.tiles.errorTarget );
			return error;

		}

	}

	dispose() {

		this.regions = [];

	}

}
