import { Matrix4, Ray, Vector3, REVISION } from 'three';

// In three.js r165 and higher raycast traversal can be ended early
const REVISION_165 = parseInt( REVISION ) < 165;
const _mat = new Matrix4();
const _localRay = new Ray();
const _vec = new Vector3();
const _hitArray = [];

function distanceSort( a, b ) {

	return a.distance - b.distance;

}

function intersectTileScene( scene, raycaster, intersects ) {

	if ( REVISION_165 ) {

		// Don't intersect the box3 helpers because those are used for debugging
		scene.traverse( c => {

			// We set the default raycast function to empty so three.js doesn't automatically cast against it
			Object.getPrototypeOf( c ).raycast.call( c, raycaster, intersects );

		} );
		_hitArray.sort( distanceSort );

	} else {

		raycaster.intersectObject( scene, true, intersects );

	}

}

function intersectTileSceneFirstHist( scene, raycaster ) {

	intersectTileScene( scene, raycaster, _hitArray );

	const hit = _hitArray[ 0 ] || null;
	_hitArray.length = 0;
	return hit;

}

// Returns the closest hit when traversing the tree
export function raycastTraverseFirstHit( renderer, tile, raycaster, localRay = null ) {

	const { group, activeTiles } = renderer;
	renderer.ensureChildrenArePreprocessed( tile );

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		_mat.copy( group.matrixWorld ).invert();
		localRay.copy( raycaster.ray ).applyMatrix4( _mat );

	}

	// get a set of intersections so we intersect the nearest one first
	const array = [];
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const child = children[ i ];
		if ( ! child.__used ) {

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

		const hit = intersectTileSceneFirstHist( tile.cached.scene, raycaster );
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

	const { group, activeTiles } = renderer;
	const { scene, boundingVolume } = tile.cached;
	renderer.ensureChildrenArePreprocessed( tile );

	// get the ray in the local group frame
	if ( localRay === null ) {

		localRay = _localRay;
		_mat.copy( group.matrixWorld ).invert();
		localRay.copy( raycaster.ray ).applyMatrix4( _mat );

	}

	if ( ! tile.__used || ! boundingVolume.intersectsRay( localRay ) ) {

		return;

	}

	if ( activeTiles.has( tile ) ) {

		intersectTileScene( scene, raycaster, intersects );

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		raycastTraverse( renderer, children[ i ], raycaster, intersects, localRay );

	}

}
