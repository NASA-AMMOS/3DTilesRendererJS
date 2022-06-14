import { Matrix4, Sphere, Ray, Vector3 } from 'three';
const _sphere = new Sphere();
const _mat = new Matrix4();
const _vec = new Vector3();
const _vec2 = new Vector3();
const _ray = new Ray();

const _hitArray = [];

function distanceSort( a, b ) {

	return a.distance - b.distance;

}

function intersectTileScene( scene, raycaster, intersects ) {

	// Don't intersect the box3 helpers because those are used for debugging
	scene.traverse( c => {

		// We set the default raycast function to empty so three.js doesn't automatically cast against it
		Object.getPrototypeOf( c ).raycast.call( c, raycaster, intersects );

	} );

}

// Returns the closest hit when traversing the tree
export function raycastTraverseFirstHit( root, group, activeTiles, raycaster ) {

	// If the root is active make sure we've checked it
	if ( activeTiles.has( root ) ) {

		intersectTileScene( root.cached.scene, raycaster, _hitArray );

		if ( _hitArray.length > 0 ) {

			if ( _hitArray.length > 1 ) {

				_hitArray.sort( distanceSort );

			}

			const res = _hitArray[ 0 ];
			_hitArray.length = 0;
			return res;

		} else {

			return null;

		}

	}

	// TODO: can we avoid creating a new array here every time to save on memory?
	const array = [];
	const children = root.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const tile = children[ i ];
		const cached = tile.cached;
		const groupMatrixWorld = group.matrixWorld;

		_mat.copy( groupMatrixWorld );

		// if we don't hit the sphere then early out
		const sphere = cached.sphere;
		if ( sphere ) {

			_sphere.copy( sphere );
			_sphere.applyMatrix4( _mat );
			if ( ! raycaster.ray.intersectsSphere( _sphere ) ) {

				continue;

			}

		}

		// TODO: check region?

		const boundingBox = cached.box;
		const obbMat = cached.boxTransform;
		if ( boundingBox ) {

			_mat.multiply( obbMat ).invert();
			_ray.copy( raycaster.ray );
			_ray.applyMatrix4( _mat );
			if ( _ray.intersectBox( boundingBox, _vec ) ) {

				// account for tile scale
				_vec2.setFromMatrixScale( _mat );
				const invScale = _vec2.x;

				if ( Math.abs( Math.max( _vec2.x - _vec2.y, _vec2.x - _vec2.z ) ) > 1e-6 ) {

					console.warn( 'ThreeTilesRenderer : Non uniform scale used for tile which may cause issues when raycasting.' );

				}

				// if we intersect the box save the distance to the tile bounds
				const data = {
					distance: Infinity,
					tile: null
				};
				array.push( data );

				data.distance = _vec.distanceToSquared( _ray.origin ) * invScale * invScale;
				data.tile = tile;

			} else {

				continue;

			}

		}

	}

	// sort them by ascending distance
	array.sort( distanceSort );

	// traverse until we find the best hit and early out if a tile bounds
	// couldn't possible include a best hit
	let bestDistanceSquared = Infinity;
	let bestHit = null;
	for ( let i = 0, l = array.length; i < l; i ++ ) {

		const data = array[ i ];
		const distanceSquared = data.distance;
		if ( distanceSquared > bestDistanceSquared ) {

			break;

		} else {

			const tile = data.tile;
			const scene = tile.cached.scene;

			let hit = null;
			if ( activeTiles.has( tile ) ) {

				// save the hit if it's closer
				intersectTileScene( scene, raycaster, _hitArray );
				if ( _hitArray.length > 0 ) {

					if ( _hitArray.length > 1 ) {

						_hitArray.sort( distanceSort );

					}

					hit = _hitArray[ 0 ];

				}

			} else {

				hit = raycastTraverseFirstHit( tile, group, activeTiles, raycaster );

			}

			if ( hit ) {

				const hitDistanceSquared = hit.distance * hit.distance;
				if ( hitDistanceSquared < bestDistanceSquared ) {

					bestDistanceSquared = hitDistanceSquared;
					bestHit = hit;

				}
				_hitArray.length = 0;

			}

		}

	}

	return bestHit;

}

export function raycastTraverse( tile, group, activeTiles, raycaster, intersects ) {

	const cached = tile.cached;
	const groupMatrixWorld = group.matrixWorld;

	_mat.copy( groupMatrixWorld );

	// Early out if we don't hit this tile sphere
	const sphere = cached.sphere;
	if ( sphere ) {

		_sphere.copy( sphere );
		_sphere.applyMatrix4( _mat );
		if ( ! raycaster.ray.intersectsSphere( _sphere ) ) {

			return;

		}

	}

	// Early out if we don't this this tile box
	const boundingBox = cached.box;
	const obbMat = cached.boxTransform;
	if ( boundingBox ) {

		_mat.multiply( obbMat ).invert();
		_ray.copy( raycaster.ray ).applyMatrix4( _mat );
		if ( ! _ray.intersectsBox( boundingBox ) ) {

			return;

		}

	}

	// TODO: check region

	const scene = cached.scene;
	if ( activeTiles.has( tile ) ) {

		intersectTileScene( scene, raycaster, intersects );
		return;

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		raycastTraverse( children[ i ], group, activeTiles, raycaster, intersects );

	}

}
