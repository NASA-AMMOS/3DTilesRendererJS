import { Matrix4, Sphere, Ray, Vector3, Box3Helper } from 'three';
const _sphere = new Sphere();
const _mat = new Matrix4();
const _vec = new Vector3();
const _ray = new Ray();

let _currIndex = 0;
const _array = [];
const _hitArray = [];

function distanceSort( a, b ) {

	return a.distance - b.distance;

}

function intersectTileScene( scene, raycaster, intersects ) {

	// Don't intersect the box3 helpers because those are used for debugging
	scene.traverse( c => {

		if ( ! ( c instanceof Box3Helper ) ) {

			Object.getPrototypeOf( c ).raycast.call( c, raycaster, intersects );

		}

	} );

}

// Returns the closest hit when traversing the tree
export function raycastTraverseFirstHit( root, group, activeSet, raycaster ) {

	const children = root.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const tile = children[ i ];
		const cached = tile.cached;
		const groupMatrixWorld = group.matrixWorld;
		const transformMat = cached.transform;

		_mat.copy( groupMatrixWorld );
		_mat.multiply( transformMat );

		// if we don't hit the sphere then early out
		const sphere = cached.sphere;
		if ( sphere ) {

			_sphere.copy( sphere );
			_sphere.applyMatrix4( _mat );
			if ( ! raycaster.ray.intersectsSphere( _sphere ) ) {

				continue;

			}

		}

		// TODO: check region

		const boundingBox = cached.box;
		const obbMat = cached.boxTransform;
		if ( boundingBox ) {

			_mat.multiply( obbMat );
			_mat.getInverse( _mat );
			_ray.copy( raycaster.ray ).applyMatrix4( _mat );
			if ( _ray.intersectBox( boundingBox, _vec ) ) {

				// if we intersect the box save the distance to the tile bounds
				let data;
				if ( _currIndex >= _array.length ) {

					data = {
						distance: Infinity,
						tile: null
					};
					_array.push( data );

				} else {

					data = _array[ _currIndex ];

				}
				_currIndex ++;

				data.distance = _vec.distanceToSquared( _ray.origin );
				data.tile = tile;

			} else {

				continue;

			}

		}

	}

	// sort them by ascending distance
	_array.sort( distanceSort );

	// traverse until we find the best hit and early out if a tile bounds
	// couldn't possible include a best hit
	let bestDistanceSquared = Infinity;
	let bestHit = null;
	for ( let i = 0, l = _currIndex; i < l; i ++ ) {

		const data = _array[ i ];
		const distanceSquared = data.distance;
		if ( distanceSquared > bestDistanceSquared ) {

			break;

		} else {

			const tile = data.tile;
			const scene = tile.cached.scene;
			const tileChildren = tile.children;
			if ( activeSet.has( scene ) ) {

				// save the hit if it's closer
				intersectTileScene( scene, raycaster, _hitArray );
				if ( _hitArray.length > 0 ) {

					if ( _hitArray.length > 1 ) {

						_hitArray.sort( distanceSort );

					}

					const hit = _hitArray[ 0 ];
					const hitDistanceSquared = hit.distance * hit.distance;
					if ( hitDistanceSquared < bestDistanceSquared ) {

						bestDistanceSquared = hitDistanceSquared;
						bestHit = hit;

					}
					_hitArray.length = 0;

				}

			} else {

				for ( let t = 0, tl = tileChildren; t < tl; t ++ ) {

					raycastTraverseFirstHit( t, group, activeSet, raycaster );

				}

			}

		}

	}

	// reset the cached array for next use to save on object allocation
	for ( let i = 0, l = _currIndex; i < l; i ++ ) {

		const el = _array[ i ];
		el.tile = null;
		el.distance = Infinity;

	}
	_currIndex = 0;

	return bestHit;

}

export function raycastTraverse( tile, group, activeSet, raycaster, intersects ) {

	const cached = tile.cached;
	const groupMatrixWorld = group.matrixWorld;
	const transformMat = cached.transform;

	_mat.copy( groupMatrixWorld );
	_mat.multiply( transformMat );

	const sphere = cached.sphere;
	if ( sphere ) {

		_sphere.copy( sphere );
		_sphere.applyMatrix4( _mat );
		if ( ! raycaster.ray.intersectsSphere( _sphere ) ) {

			return;

		}

	}

	const boundingBox = cached.box;
	const obbMat = cached.boxTransform;
	if ( boundingBox ) {

		_mat.multiply( obbMat );
		_mat.getInverse( _mat );
		_ray.copy( raycaster.ray ).applyMatrix4( _mat );
		if ( ! _ray.intersectsBox( boundingBox ) ) {

			return;

		}

	}

	// TODO: check region

	const scene = cached.scene;
	if ( activeSet.has( scene ) ) {

		scene.traverse( c => {

			if ( ! ( c instanceof Box3Helper ) ) {

				Object.getPrototypeOf( c ).raycast.call( c, raycaster, intersects );

			}

		} );
		return;

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		raycastTraverse( children[ i ], group, activeSet, raycaster, intersects );

	}

}
