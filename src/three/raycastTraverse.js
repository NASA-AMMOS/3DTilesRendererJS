import { Matrix4, Ray } from 'three';

const _mat = new Matrix4();
const _localRay = new Ray();
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
export function raycastTraverseFirstHit( root, group, activeTiles, raycaster, localRay = null ) {

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

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		_mat.copy( group.matrixWorld ).invert();
		localRay.copy( raycaster.ray ).applyMatrix4( _mat );

	}

	// TODO: can we avoid creating a new array here every time to save on memory?
	const array = [];
	const children = root.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const tile = children[ i ];
		const cached = tile.cached;
		const boundingVolume = cached.boundingVolume;
		const distance = boundingVolume.intersectsRayDistance( localRay );

		// track the tile and hit distance for sorting
		if ( distance !== null ) {

			array.push( { distance, tile } );

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

				hit = raycastTraverseFirstHit( tile, group, activeTiles, raycaster, localRay );

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

export function raycastTraverse( tile, group, activeTiles, raycaster, intersects, localRay = null ) {

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		_mat.copy( group.matrixWorld ).invert();
		localRay.copy( raycaster.ray ).applyMatrix4( _mat );

	}

	const cached = tile.cached;
	const boundingVolume = cached.boundingVolume;
	if ( ! boundingVolume.intersectsRay( localRay ) ) {

		return;

	}

	const scene = cached.scene;
	if ( activeTiles.has( tile ) ) {

		intersectTileScene( scene, raycaster, intersects );
		return;

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		raycastTraverse( children[ i ], group, activeTiles, raycaster, intersects, localRay );

	}

}
