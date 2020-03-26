import { LOADED } from './constants.js';

function isUsedThisFrame( tile, frameCount ) {

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

function resetFrameState( tile, frameCount ) {

	if ( tile.__lastFrameVisited !== frameCount ) {

		tile.__lastFrameVisited = frameCount;
		tile.__used = false;
		tile.__inFrustum = false;
		tile.__isLeaf = false;
		tile.__visible = false;
		tile.__active = false;
		tile.__error = 0;

	}

}

function recursivelyMarkUsed( tile, frameCount, lruCache ) {

	resetFrameState( tile, frameCount );

	tile.__used = true;
	lruCache.markUsed( tile );
	if ( tile.__contentEmpty ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], frameCount, lruCache );

		}

	}

}

export function traverseSet( tile, beforeCb = null, afterCb = null, parent = null, depth = 0 ) {

	if ( beforeCb && beforeCb( tile, parent, depth ) ) {

		if ( afterCb ) {

			afterCb( tile, parent, depth );

		}

		return;

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		traverseSet( children[ i ], beforeCb, afterCb, tile, depth + 1 );

	}

	if ( afterCb ) {

		afterCb( tile, parent, depth );

	}

}

// TODO: include frustum mask here?
// TODO: this is marking items as used in the lrucache, which means some data is
// being kept around that isn't being used -- is that okay?
export function determineFrustumSet( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	const errorTarget = renderer.errorTarget;
	const maxDepth = renderer.maxDepth;
	const loadSiblings = renderer.loadSiblings;
	const lruCache = renderer.lruCache;
	resetFrameState( tile, frameCount );

	const inFrustum = renderer.tileInView( tile );
	if ( inFrustum === false ) {

		return false;

	}

	tile.__used = true;
	lruCache.markUsed( tile );

	tile.__inFrustum = true;
	stats.inFrustum ++;

	if ( ! tile.__contentEmpty ) {

		const error = renderer.calculateError( tile );
		tile.__error = error;
		if ( error <= errorTarget ) {

			return true;

		}

	}

	if ( renderer.maxDepth > 0 && tile.__depth + 1 >= maxDepth ) {

		return true;

	}

	let anyChildrenUsed = false;
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		const r = determineFrustumSet( c, renderer );
		anyChildrenUsed = anyChildrenUsed || r;

	}

	if ( anyChildrenUsed && loadSiblings ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( tile, frameCount, lruCache );

		}

	}

	return true;

}

export function markUsedSetLeaves( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	stats.used ++;

	const children = tile.children;
	let anyChildrenUsed = false;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		anyChildrenUsed = anyChildrenUsed || isUsedThisFrame( c, frameCount );

	}

	if ( ! anyChildrenUsed ) {

		tile.__isLeaf = true;

		// TODO: stats

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			markUsedSetLeaves( c, renderer );

		}

	}

}

export function skipTraversal( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	const lruCache = renderer.lruCache;
	if ( tile.__isLeaf ) {

		if ( tile.__loadingState === LOADED ) {

			if ( tile.__inFrustum ) {

				tile.__visible = true;
				stats.visible ++;

			}
			tile.__active = true;
			stats.active ++;

		} else if ( ! lruCache.isFull() ) {

			renderer.requestTileContents( tile );

		}
		return;

	}

	const errorRequirement = renderer.errorTarget * renderer.errorThreshold;
	const meetsSSE = tile.__error < errorRequirement;
	const hasContent = ! tile.__contentEmpty;
	const loadedContent = tile.__loadingState === LOADED && ! tile.__contentEmpty;
	const children = tile.children;
	let allChildrenHaveContent = true;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			const childContent = c.__loadingState === LOADED || tile.__contentEmpty;
			allChildrenHaveContent = allChildrenHaveContent && childContent;

		}

	}

	if ( meetsSSE && ! loadedContent && ! lruCache.isFull() && hasContent ) {

		renderer.requestTileContents( tile );

	}

	if ( meetsSSE && loadedContent && ! allChildrenHaveContent ) {

		if ( tile.__inFrustum ) {

			tile.__visible = true;
			stats.visible ++;

		}
		tile.__active = true;
		stats.active ++;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, frameCount ) && ! lruCache.isFull() ) {

				renderer.requestTileContents( c );

			}

		}
		return;

	}

	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			skipTraversal( c, renderer );

		}

	}

}

export function toggleTiles( tile, renderer ) {

	const frameCount = renderer.frameCount;
	const isUsed = isUsedThisFrame( tile, frameCount );
	if ( isUsed || tile.__usedLastFrame ) {

		if ( ! isUsed ) {

			if ( ! tile.__contentEmpty && tile.__loadingState === LOADED ) {

				renderer.setTileVisible( tile, false );
				renderer.setTileActive( tile, false );

			}
			tile.__usedLastFrame = false;

		} else {

			if ( ! tile.__contentEmpty && tile.__loadingState === LOADED ) {

				// enable visibility if active due to shadows
				renderer.setTileActive( tile, tile.__active );
				renderer.setTileVisible( tile, tile.__active || tile.__visible );

			}
			tile.__usedLastFrame = true;

		}

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			toggleTiles( c, renderer );

		}

	}

}
