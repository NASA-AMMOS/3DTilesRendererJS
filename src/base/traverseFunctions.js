import { LOADED, FAILED } from './constants.js';

function isDownloadFinished( value ) {

	return value === LOADED || value === FAILED;

}

// Checks whether this tile was last used on the given frame.
function isUsedThisFrame( tile, frameCount ) {

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

// Resets the frame frame information for the given tile
function resetFrameState( tile, frameCount ) {

	if ( tile.__lastFrameVisited !== frameCount ) {

		tile.__lastFrameVisited = frameCount;
		tile.__used = false;
		tile.__inFrustum = false;
		tile.__isLeaf = false;
		tile.__visible = false;
		tile.__active = false;
		tile.__error = Infinity;
		tile.__distanceFromCamera = Infinity;
		tile.__childrenWereVisible = false;
		tile.__allChildrenLoaded = false;

	}

}

// Recursively mark tiles used down to the next tile with content
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

function recursivelyLoadTiles( tile, depthFromRenderedParent, renderer ) {

	// Try to load any external tile set children if the external tile set has loaded.
	const doTraverse =
		tile.__contentEmpty && (
			! tile.__externalTileSet ||
			isDownloadFinished( tile.__loadingState )
		);
	if ( doTraverse ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			// don't increment depth to rendered parent here because we should treat
			// the next layer of rendered children as just a single depth away for the
			// sake of sorting.
			const child = children[ i ];
			child.__depthFromRenderedParent = depthFromRenderedParent;
			recursivelyLoadTiles( child, depthFromRenderedParent, renderer );

		}

	} else {

		renderer.requestTileContents( tile );

	}

}

// Helper function for recursively traversing a tile set. If `beforeCb` returns `true` then the
// traversal will end early.
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

// Determine which tiles are within the camera frustum.
// TODO: this is marking items as used in the lrucache, which means some data is
// being kept around that isn't being used -- is that okay?
export function determineFrustumSet( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	const errorTarget = renderer.errorTarget;
	const maxDepth = renderer.maxDepth;
	const loadSiblings = renderer.loadSiblings;
	const lruCache = renderer.lruCache;
	const stopAtEmptyTiles = renderer.stopAtEmptyTiles;
	resetFrameState( tile, frameCount );

	// Early out if this tile is not within view.
	const inFrustum = renderer.tileInView( tile );
	if ( inFrustum === false ) {

		return false;

	}

	tile.__used = true;
	lruCache.markUsed( tile );

	tile.__inFrustum = true;
	stats.inFrustum ++;

	// Early out if this tile has less error than we're targeting but don't stop
	// at an external tile set.
	if ( ( stopAtEmptyTiles || ! tile.__contentEmpty ) && ! tile.__externalTileSet ) {

		// compute the _error and __distanceFromCamera fields
		renderer.calculateError( tile );

		const error = tile.__error;
		if ( error <= errorTarget ) {

			return true;

		}

		// Early out if we've reached the maximum allowed depth.
		if ( renderer.maxDepth > 0 && tile.__depth + 1 >= maxDepth ) {

			return true;

		}

	}

	// Traverse children and see if any children are in view.
	let anyChildrenUsed = false;
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		const r = determineFrustumSet( c, renderer );
		anyChildrenUsed = anyChildrenUsed || r;

	}

	// If there are children within view and we are loading siblings then mark
	// all sibling tiles as used, as well.
	if ( anyChildrenUsed && loadSiblings ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			recursivelyMarkUsed( c, frameCount, lruCache );

		}

	}

	return true;

}

// Traverse and mark the tiles that are at the leaf nodes of the "used" tree.
export function markUsedSetLeaves( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	stats.used ++;

	// This tile is a leaf if none of the children had been used.
	const children = tile.children;
	let anyChildrenUsed = false;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		anyChildrenUsed = anyChildrenUsed || isUsedThisFrame( c, frameCount );

	}


	if ( ! anyChildrenUsed ) {

		// TODO: This isn't necessarily right because it's possible that a parent tile is considered in the
		// frustum while the child tiles are not, making them unused. If all children have loaded and were properly
		// considered to be in the used set then we shouldn't set ourselves to a leaf here.
		tile.__isLeaf = true;

	} else {

		let childrenWereVisible = false;
		let allChildrenLoaded = true;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			markUsedSetLeaves( c, renderer );
			childrenWereVisible = childrenWereVisible || c.__wasSetVisible || c.__childrenWereVisible;

			if ( isUsedThisFrame( c, frameCount ) ) {

				const childLoaded =
					c.__allChildrenLoaded ||
					( ! c.__contentEmpty && isDownloadFinished( c.__loadingState ) ) ||
					( c.__externalTileSet && c.__loadingState === FAILED );
				allChildrenLoaded = allChildrenLoaded && childLoaded;

			}

		}
		tile.__childrenWereVisible = childrenWereVisible;
		tile.__allChildrenLoaded = allChildrenLoaded;


	}

}

// Skip past tiles we consider unrenderable because they are outside the error threshold.
export function skipTraversal( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	const parent = tile.parent;
	const parentDepthToParent = parent ? parent.__depthFromRenderedParent : - 1;
	tile.__depthFromRenderedParent = parentDepthToParent;

	// Request the tile contents or mark it as visible if we've found a leaf.
	const lruCache = renderer.lruCache;
	if ( tile.__isLeaf ) {

		tile.__depthFromRenderedParent ++;

		if ( tile.__loadingState === LOADED ) {

			if ( tile.__inFrustum ) {

				tile.__visible = true;
				stats.visible ++;

			}
			tile.__active = true;
			stats.active ++;

		} else if ( ! lruCache.isFull() && ( ! tile.__contentEmpty || tile.__externalTileSet ) ) {

			renderer.requestTileContents( tile );

		}

		return;

	}

	const errorRequirement = ( renderer.errorTarget + 1 ) * renderer.errorThreshold;
	const meetsSSE = tile.__error <= errorRequirement;
	const includeTile = meetsSSE || tile.refine === 'ADD';
	const hasModel = ! tile.__contentEmpty;
	const hasContent = hasModel || tile.__externalTileSet;
	const loadedContent = isDownloadFinished( tile.__loadingState ) && hasContent;
	const childrenWereVisible = tile.__childrenWereVisible;
	const children = tile.children;
	const allChildrenHaveContent = tile.__allChildrenLoaded;

	// Increment the relative depth of the node to the nearest rendered parent if it has content
	// and is being rendered.
	if ( includeTile && hasModel ) {

		tile.__depthFromRenderedParent ++;

	}

	// If we've met the SSE requirements and we can load content then fire a fetch.
	if ( includeTile && ! loadedContent && ! lruCache.isFull() && hasContent ) {

		renderer.requestTileContents( tile );

	}

	// Only mark this tile as visible if it meets the screen space error requirements, has loaded content, not
	// all children have loaded yet, and if no children were visible last frame. We want to keep children visible
	// that _were_ visible to avoid a pop in level of detail as the camera moves around and parent / sibling tiles
	// load in.

	// Skip the tile entirely if there's no content to load
	if (
		( meetsSSE && ! allChildrenHaveContent && ! childrenWereVisible && loadedContent )
			|| ( tile.refine === 'ADD' && loadedContent )
	) {

		if ( tile.__inFrustum ) {

			tile.__visible = true;
			stats.visible ++;

		}
		tile.__active = true;
		stats.active ++;

	}

	// If we're additive then don't stop the traversal here because it doesn't matter whether the children load in
	// at the same rate.
	if ( tile.refine !== 'ADD' && meetsSSE && ! allChildrenHaveContent && loadedContent ) {

		// load the child content if we've found that we've been loaded so we can move down to the next tile
		// layer when the data has loaded.
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, frameCount ) && ! lruCache.isFull() ) {

				c.__depthFromRenderedParent = tile.__depthFromRenderedParent + 1;
				recursivelyLoadTiles( c, c.__depthFromRenderedParent, renderer );

			}

		}

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, frameCount ) ) {

				skipTraversal( c, renderer );

			}

		}

	}

}

// Final traverse to toggle tile visibility.
export function toggleTiles( tile, renderer ) {

	const frameCount = renderer.frameCount;
	const isUsed = isUsedThisFrame( tile, frameCount );
	if ( isUsed || tile.__usedLastFrame ) {

		let setActive = false;
		let setVisible = false;
		if ( isUsed ) {

			// enable visibility if active due to shadows
			setActive = tile.__active;
			if ( renderer.displayActiveTiles ) {

				setVisible = tile.__active || tile.__visible;

			} else {

				setVisible = tile.__visible;

			}

		}

		// If the active or visible state changed then call the functions.
		if ( ! tile.__contentEmpty && tile.__loadingState === LOADED ) {

			if ( tile.__wasSetActive !== setActive ) {

				renderer.setTileActive( tile, setActive );

			}

			if ( tile.__wasSetVisible !== setVisible ) {

				renderer.setTileVisible( tile, setVisible );

			}

		}
		tile.__wasSetActive = setActive;
		tile.__wasSetVisible = setVisible;
		tile.__usedLastFrame = isUsed;

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			toggleTiles( c, renderer );

		}

	}

}
