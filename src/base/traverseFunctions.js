import { LOADED, FAILED } from './constants.js';

function isDownloadFinished( value ) {

	return value === LOADED || value === FAILED;

}

// Checks whether this tile was last used on the given frame.
function isUsedThisFrame( tile, frameCount ) {

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

// Resets the frame frame information for the given tile
function resetFrameState( tile, renderer ) {

	if ( tile.__lastFrameVisited !== renderer.frameCount ) {

		tile.__lastFrameVisited = renderer.frameCount;
		tile.__used = false;
		tile.__inFrustum = false;
		tile.__isLeaf = false;
		tile.__visible = false;
		tile.__active = false;
		tile.__error = Infinity;
		tile.__distanceFromCamera = Infinity;
		tile.__childrenWereVisible = false;
		tile.__allChildrenLoaded = false;

		// update tile frustum and error state
		tile.__inFrustum = renderer.tileInView( tile );
		renderer.calculateError( tile );

	}

}

// Recursively mark tiles used down to the next tile with content
function recursivelyMarkUsed( tile, renderer ) {

	renderer.ensureChildrenArePreprocessed( tile );

	resetFrameState( tile, renderer );
	markUsed( tile, renderer );

	if ( ! tile.__hasRenderableContent ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer );

		}

	}

}

// Recursively traverses to the next tiles with unloaded renderable content to load them
function recursivelyLoadNextRenderableTiles( tile, renderer ) {

	renderer.ensureChildrenArePreprocessed( tile );

	// Try to load any external tile set children if the external tile set has loaded.
	const doTraverse =
		isUsedThisFrame( tile, renderer.frameCount ) &&
		! tile.__hasRenderableContent && (
			! tile.__hasUnrenderableContent ||
			isDownloadFinished( tile.__loadingState )
		);

	if ( doTraverse ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			// don't increment depth to rendered parent here because we should treat
			// the next layer of rendered children as just a single depth away for the
			// sake of sorting.
			const child = children[ i ];
			recursivelyLoadNextRenderableTiles( child, renderer );

		}

	} else {

		renderer.queueTileForDownload( tile );

	}

}

// Mark a tile as being used by current view
function markUsed( tile, renderer ) {

	tile.__used = true;
	renderer.lruCache.markUsed( tile );
	renderer.stats.used ++;

	if ( tile.__inFrustum === true ) {

		renderer.stats.inFrustum ++;

	}

}

// Returns whether the tile can be traversed to the next layer of children by checking the tile metrics
function canTraverse( tile, renderer ) {

	// If we've met the error requirements then don't load further
	if ( tile.__error <= renderer.errorTarget ) {

		return false;

	}

	// Early out if we've reached the maximum allowed depth.
	if ( renderer.maxDepth > 0 && tile.__depth + 1 >= renderer.maxDepth ) {

		return false;

	}

	return true;

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

// Determine which tiles are used by the renderer given the current camera configuration
export function markUsedTiles( tile, renderer ) {

	// determine frustum set is run first so we can ensure the preprocessing of all the necessary
	// child tiles has happened here.
	renderer.ensureChildrenArePreprocessed( tile );

	resetFrameState( tile, renderer );

	if ( ! tile.__inFrustum ) {

		return;

	}

	markUsed( tile, renderer );

	if ( ! canTraverse( tile, renderer ) ) {

		return;

	}

	// Traverse children and see if any children are in view.
	let anyChildrenUsed = false;
	let anyChildrenInFrustum = false;
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		markUsedTiles( c, renderer );
		anyChildrenUsed = anyChildrenUsed || isUsedThisFrame( c, renderer.frameCount );
		anyChildrenInFrustum = anyChildrenInFrustum || c.__inFrustum;

	}

	// if none of the children are in the frustum then this tile shouldn't be displayed
	if ( tile.refine === 'REPLACE' && ! anyChildrenInFrustum && children.length !== 0 ) {

		tile.__inFrustum = false;
		tile.__used = false;
		return;

	}

	// If this is a tile that needs children loaded to refine then recursively load child
	// tiles until error is met
	if ( anyChildrenUsed && tile.refine === 'REPLACE' ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			recursivelyMarkUsed( c, renderer );

		}

	}

}

// Traverse and mark the tiles that are at the leaf nodes of the "used" tree.
export function markUsedSetLeaves( tile, renderer ) {

	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	// This tile is a leaf if none of the children had been used.
	const children = tile.children;
	let anyChildrenUsed = false;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		anyChildrenUsed = anyChildrenUsed || isUsedThisFrame( c, frameCount );

	}

	if ( ! anyChildrenUsed ) {

		tile.__isLeaf = true;

	} else {

		let childrenWereVisible = false;
		let allChildrenLoaded = true;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			markUsedSetLeaves( c, renderer );
			childrenWereVisible = childrenWereVisible || c.__wasSetVisible || c.__childrenWereVisible;

			if ( isUsedThisFrame( c, frameCount ) ) {

				// consider a child to be loaded if
				// - the children's children have been loaded
				// - the tile content has loaded
				// - the tile is completely empty - ie has no children and no content
				// - the child tile set has tried to load but failed
				const childLoaded =
					c.__allChildrenLoaded ||
					( c.__hasRenderableContent && isDownloadFinished( c.__loadingState ) ) ||
					( ! c.__hasContent && c.children.length === 0 ) ||
					( c.__hasUnrenderableContent && c.__loadingState === FAILED );
				allChildrenLoaded = allChildrenLoaded && childLoaded;

			}

		}

		tile.__childrenWereVisible = childrenWereVisible;
		tile.__allChildrenLoaded = allChildrenLoaded;

	}

}

// TODO: revisit implementation
// Skip past tiles we consider unrenderable because they are outside the error threshold.
export function markVisibleTiles( tile, renderer ) {

	const stats = renderer.stats;
	if ( ! isUsedThisFrame( tile, renderer.frameCount ) ) {

		return;

	}

	// Request the tile contents or mark it as visible if we've found a leaf.
	const lruCache = renderer.lruCache;
	if ( tile.__isLeaf ) {

		if ( tile.__loadingState === LOADED ) {

			if ( tile.__inFrustum ) {

				tile.__visible = true;
				stats.visible ++;

			}
			tile.__active = true;
			stats.active ++;

		} else if ( ! lruCache.isFull() && tile.__hasContent ) {

			renderer.queueTileForDownload( tile );

		}

		return;

	}

	const children = tile.children;
	const hasContent = tile.__hasContent;
	const loadedContent = isDownloadFinished( tile.__loadingState ) && hasContent;
	const errorRequirement = ( renderer.errorTarget + 1 ) * renderer.errorThreshold;
	const meetsSSE = tile.__error <= errorRequirement;
	const childrenWereVisible = tile.__childrenWereVisible;

	// we don't wait for all children tiles to load if this tile set has empty tiles at the root
	const emptyRootTile = tile.__depthFromRenderedParent === 0;
	const allChildrenLoaded = tile.__allChildrenLoaded || emptyRootTile;

	// If we've met the SSE requirements and we can load content then fire a fetch.
	const includeTile = meetsSSE || tile.refine === 'ADD';
	if ( includeTile && ! loadedContent && ! lruCache.isFull() && hasContent ) {

		renderer.queueTileForDownload( tile );

	}

	// Only mark this tile as visible if it meets the screen space error requirements, has loaded content, not
	// all children have loaded yet, and if no children were visible last frame. We want to keep children visible
	// that _were_ visible to avoid a pop in level of detail as the camera moves around and parent / sibling tiles
	// load in.

	// Skip the tile entirely if there's no content to load
	if (
		( meetsSSE && ! allChildrenLoaded && ! childrenWereVisible && loadedContent )
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
	if ( tile.refine === 'REPLACE' && meetsSSE && ! allChildrenLoaded && loadedContent ) {

		// load the child content if we've found that we've been loaded so we can move down to the next tile
		// layer when the data has loaded.
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, renderer.frameCount ) && ! lruCache.isFull() ) {

				recursivelyLoadNextRenderableTiles( c, renderer );

			}

		}

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			markVisibleTiles( children[ i ], renderer );

		}

	}

}

// Final traverse to toggle tile visibility.
export function toggleTiles( tile, renderer ) {

	const isUsed = isUsedThisFrame( tile, renderer.frameCount );
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
		if ( tile.__hasRenderableContent && tile.__loadingState === LOADED ) {

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
