import { Ray, Vector3 } from 'three';

// In three.js r165 and higher raycast traversal can be ended early
const _localRay = new Ray();
const _vec = new Vector3();
const _hitArray = [];

function distanceSort( a, b ) {

	return a.distance - b.distance;

}

function intersectTileScene( tile, raycaster, renderer, intersects ) {

	const { scene } = tile.cached;
	const didRaycast = renderer.invokeOnePlugin( plugin => plugin.raycastTile && plugin.raycastTile( tile, scene, raycaster, intersects ) );
	if ( ! didRaycast ) {

		raycaster.intersectObject( scene, true, intersects );

	}

}

function intersectTileSceneFirstHist( tile, raycaster, renderer ) {

	intersectTileScene( tile, raycaster, renderer, _hitArray );
	_hitArray.sort( distanceSort );

	const hit = _hitArray[ 0 ] || null;
	_hitArray.length = 0;
	return hit;

}

function isTileInitialized( tile ) {

	return '__used' in tile;

}

// Returns the closest hit when traversing the tree
export function raycastTraverseFirstHit( renderer, tile, raycaster, localRay = null ) {

	const { group, activeTiles } = renderer;

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		localRay.copy( raycaster.ray ).applyMatrix4( group.matrixWorldInverse );

	}

	// get a set of intersections so we intersect the nearest one first
	const array = [];
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const child = children[ i ];
		if ( ! isTileInitialized( child ) || ! child.__used ) {

			continue;

		}

		// track the tile and hit distance for sorting
		const boundingVolume = child.cached.boundingVolume;
		if ( boundingVolume.intersectRay( localRay, _vec ) !== null ) {

			_vec.applyMatrix4( group.matrixWorld );
			array.push( {
				distance: _vec.distanceToSquared( raycaster.ray.origin ),
				tile: child,
			} );

		}

	}

	// sort them by ascending distance
	array.sort( distanceSort );

	// If the root is active make sure we've checked it
	let bestHit = null;
	let bestHitDistSq = Infinity;
	if ( activeTiles.has( tile ) ) {

		const hit = intersectTileSceneFirstHist( tile, raycaster, renderer );
		if ( hit ) {

			bestHit = hit;
			bestHitDistSq = hit.distance * hit.distance;

		}

	}

	// traverse until we find the best hit and early out if a tile bounds
	// couldn't possible include a best hit
	for ( let i = 0, l = array.length; i < l; i ++ ) {

		const data = array[ i ];
		const boundingVolumeDistSq = data.distance;
		const tile = data.tile;
		if ( boundingVolumeDistSq > bestHitDistSq ) {

			break;

		}

		const hit = raycastTraverseFirstHit( renderer, tile, raycaster, localRay );
		if ( hit ) {

			const hitDistSq = hit.distance * hit.distance;
			if ( hitDistSq < bestHitDistSq ) {

				bestHit = hit;
				bestHitDistSq = hitDistSq;

			}

		}

	}

	return bestHit;

}

export function raycastTraverse( renderer, tile, raycaster, intersects, localRay = null ) {

	// if the tile has not been asynchronously initialized then there's no point in
	// traversing the tiles to check intersections.
	if ( ! isTileInitialized( tile ) ) {

		return;

	}

	const { group, activeTiles } = renderer;
	const { boundingVolume } = tile.cached;

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		localRay.copy( raycaster.ray ).applyMatrix4( group.matrixWorldInverse );

	}

	// exit early if the tile isn't used or the bounding volume is not intersected
	if ( ! tile.__used || ! boundingVolume.intersectsRay( localRay ) ) {

		return;

	}

	// only intersect the tile geometry if it's active
	if ( activeTiles.has( tile ) ) {

		intersectTileScene( tile, raycaster, renderer, intersects );

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		raycastTraverse( renderer, children[ i ], raycaster, intersects, localRay );

	}

}
