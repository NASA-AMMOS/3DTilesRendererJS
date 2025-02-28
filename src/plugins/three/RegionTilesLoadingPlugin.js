import { Sphere, Ray, Frustum, Matrix4 } from 'three';
import { EllipsoidRegion } from '../../three/math/EllipsoidRegion';
import { OBB } from '../../three/math/OBB';

let _regionId = 0;
const _matInv = new Matrix4().identity();
const _mat = new Matrix4().identity();
const _ray = new Ray();
const _obb = new OBB();
const _frustum = new Frustum();
const _frustum1 = new Frustum();
const _sphere = new Sphere();

export class RegionTilesLoadingPlugin {

	constructor() {


		this.name = 'REGION_TILES_LOADING_PLUGIN';
		this.__regions = {};
		this.__regionsArraySorted = [];
		this.__oldTileInView = null;
		this.__oldCalculateError = null;

	}

	init( tiles ) {

		this.tiles = tiles;
		this._onlyLoadTilesInRegions = false;

	}

	setOnlyLoadTilesInRegions( value ) {

		this._onlyLoadTilesInRegions = value;

	}

	addLoadRegion( region ) {

		const id = _regionId ++;
		this.__regions[ id ] = {

			id,
			shape: region.shape,
			errorTarget: region.errorTarget

		};

		this.__regionsArraySorted.push( this.__regions[ id ] );
		this.__regionsArraySorted.sort( ( a, b ) => a.errorTarget - b.errorTarget );

		return id;

	}

	removeRegionById( id ) {

		delete this.__regions[ id ];
		this.__regionsArraySorted = this.__regionsArraySorted.filter( region => region.id !== id );

	}

	clearRegions() {

		this.__regions = {};
		this.__regionsArraySorted = [];

	}


	tileInView( tile ) {

		const boundingVolume = tile.cached.boundingVolume;

		if ( this.__regionsArraySorted.length > 0 && ! _mat.equals( this.tiles.group.matrixWorld ) ) {

			_mat.copy( this.tiles.group.matrixWorld );
			_matInv.copy( this.tiles.group.matrixWorld ).invert();

		}

		tile.__inRegion = false;
		tile.__regionErrorTarget = Infinity;

		for ( const region of this.__regionsArraySorted ) {

			const shape = region.shape;

			if ( shape instanceof Sphere ) {

				_sphere.copy( shape ).applyMatrix4( _matInv );

				const obb = boundingVolume.obb || boundingVolume.regionObb;
				const sphere = boundingVolume.sphere;


				if ( sphere && sphere.intersectsSphere( _sphere ) ) {

					tile.__inRegion = true;
					tile.__regionErrorTarget = region.errorTarget;
					return true;

				}

				if ( obb ) {

					const frustum = new Frustum( ...obb.planes );

					if ( frustum.intersectsSphere( _sphere ) ) {

						tile.__inRegion = true;
						tile.__regionErrorTarget = region.errorTarget;
						return true;

					}

				}

			} else if ( shape instanceof OBB ) {


				_frustum.set( ...shape.planes ).applyMatrix4( _matInv );

				const obb = boundingVolume.obb || boundingVolume.regionObb;
				const sphere = boundingVolume.sphere;

				if ( sphere && _frustum.intersectsSphere( sphere ) ) {

					tile.__inRegion = true;
					tile.__regionErrorTarget = region.errorTarget;
					return true;

				}

				if ( obb ) {

					_frustum1.set( ...obb.planes );

					if ( _frustum1.intersectsFrustum( _frustum ) ) {

						tile.__inRegion = true;
						tile.__regionErrorTarget = region.errorTarget;
						return true;

					}

				}

			} else if ( shape instanceof EllipsoidRegion ) {

				shape.getBoundingBox( _obb.box, _obb.transform );
				_obb.update();
				_frustum.set( ..._obb.planes ).applyMatrix4( _matInv );

				const obb = boundingVolume.obb || boundingVolume.regionObb;
				const sphere = boundingVolume.sphere;

				if ( sphere && _frustum.intersectsSphere( sphere ) ) {

					tile.__inRegion = true;
					tile.__regionErrorTarget = region.errorTarget;
					return true;

				}

				if ( obb ) {

					_frustum1.set( ...obb.planes );

					if ( _frustum1.intersectsFrustum( _frustum ) ) {

						tile.__inRegion = true;
						tile.__regionErrorTarget = region.errorTarget;
						return true;

					}

				}

			} else if ( shape instanceof Frustum ) {

				_frustum.copy( shape ).applyMatrix4( _matInv );

				if ( boundingVolume.intersectsFrustum( _frustum ) ) {

					tile.__inRegion = true;
					tile.__regionErrorTarget = region.errorTarget;
					return true;

				}

			} else if ( shape instanceof Ray ) {

				_ray.copy( shape ).applyMatrix4( _matInv );

				if ( boundingVolume.intersectsRay( _ray ) ) {

					tile.__inRegion = true;
					tile.__regionErrorTarget = region.errorTarget;
					return true;

				}

			}

		}

		return false;

	}

	calculateError( tile ) {

		if ( tile.__inRegion ) {

			const { tiles } = this;
			return tile.geometricError - tile.__regionErrorTarget + tiles.errorTarget + 100;

			// tile.__error += Math.max( this.tiles.errorTarget - tile.__regionErrorTarget, 0 );

		}

	}

	dispose() {

		this.__regions = {};
		this.__regionsArraySorted = [];
		this.tiles.tileInView = this.__oldTileInView;
		this.tiles.calculateError = this.__oldCalculateError;

	}

}
