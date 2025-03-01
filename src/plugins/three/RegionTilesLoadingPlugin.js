import { Sphere, Ray, Frustum, Matrix4 } from 'three';
import { EllipsoidRegion } from '../../three/math/EllipsoidRegion';
import { OBB } from '../../three/math/OBB';

const _mat = new Matrix4().identity();
const _matInv = new Matrix4().identity();
const _ray = new Ray();
const _obb = new OBB();
const _frustum = new Frustum();
const _frustum1 = new Frustum();
const _sphere = new Sphere();

export class RegionTilesLoadingPlugin {

	constructor() {


		this.name = 'REGION_TILES_LOADING_PLUGIN';
		this.__regionsSorted = [];
		this.__oldTileInView = null;
		this.__oldCalculateError = null;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	addRegion( region ) {

		if ( this.__regionsSorted.indexOf( region ) === - 1 ) {

			const index = this.__regionsSorted.findIndex( r => r.errorTarget > region.errorTarget );
			this.__regionsSorted.splice( index, 0, region );

		}

	}

	removeRegion( region ) {

		const index = this.__regionsSorted.indexOf( region );
		if ( index !== - 1 ) {

			this.__regionsSorted.splice( index, 1 );

		}

	}

	hasRegion( region ) {

		return this.__regionsSorted.indexOf( region ) !== - 1;

	}

	clearRegions() {

		this.__regionsSorted = [];

	}


	tileInView( tile ) {

		const boundingVolume = tile.cached.boundingVolume;

		if ( this.__regionsSorted.length > 0 && ! _mat.equals( this.tiles.group.matrixWorld ) ) {

			_mat.copy( this.tiles.group.matrixWorld );
			_matInv.copy( this.tiles.group.matrixWorld ).invert();

		}

		tile.__inRegion = false;
		tile.__regionErrorTarget = Infinity;

		for ( const region of this.__regionsSorted ) {

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
			return tile.geometricError - tile.__regionErrorTarget + tiles.errorTarget;

		}

	}

	dispose() {

		this.__regionsSorted = [];

	}

}
