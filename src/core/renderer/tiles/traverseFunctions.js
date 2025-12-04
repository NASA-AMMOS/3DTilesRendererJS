import { LOADED, FAILED } from '../constants.js';

const viewErrorTarget = {
	inView: false,
	error: Infinity,
	distanceFromCamera: Infinity,
};

// flag guiding the behavior of the traversal to load the siblings at the root of the
// tileset or not. The spec seems to indicate "true" when using REPLACE define but
// Cesium's behavior is "false".
// See CesiumGS/3d-tiles#776
const LOAD_ROOT_SIBLINGS = true;

function isDownloadFinished( value ) {

	return value === LOADED || value === FAILED;

}

// Checks whether this tile was last used on the given frame.
function isUsedThisFrame( tile, frameCount ) {

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

function areChildrenProcessed( tile ) {

	return tile.__childrenProcessed === tile.children.length;

}

function canUnconditionallyRefine( tile ) {

	return tile.__hasUnrenderableContent || ( tile.parent && tile.parent.geometricError < tile.geometricError );

}

// Resets the frame information for the given tile
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
		tile.__allChildrenReady = false;

		// update tile frustum and error state
		renderer.calculateTileViewError( tile, viewErrorTarget );
		tile.__inFrustum = viewErrorTarget.inView;
		tile.__error = viewErrorTarget.error;
		tile.__distanceFromCamera = viewErrorTarget.distanceFromCamera;

	}

}

// Recursively mark tiles used down to the next layer, skipping external tilesets
function recursivelyMarkUsed( tile, renderer, cacheOnly = false ) {

	renderer.ensureChildrenArePreprocessed( tile );

	resetFrameState( tile, renderer );
	markUsed( tile, renderer, cacheOnly );

	// don't traverse if the children have not been processed, yet but tileset content
	// should be considered to be "replaced" by the loaded children so await that here.
	if ( canUnconditionallyRefine( tile ) && areChildrenProcessed( tile ) ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer, cacheOnly );

		}

	}

}

// Recursively traverses to the next tiles with unloaded renderable content to load them
function recursivelyLoadNextRenderableTiles( tile, renderer ) {

	renderer.ensureChildrenArePreprocessed( tile );

	// exit the recursion if the tile hasn't been used this frame
	if ( isUsedThisFrame( tile, renderer.frameCount ) ) {

		// queue this tile to download content
		if ( tile.__hasContent ) {

			renderer.queueTileForDownload( tile );

		}

		if ( areChildrenProcessed( tile ) ) {

			// queue any used child tiles
			const children = tile.children;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				recursivelyLoadNextRenderableTiles( children[ i ], renderer );

			}

		}

	}

}

// Mark a tile as being used by current view
function markUsed( tile, renderer, cacheOnly = false ) {

	if ( tile.__used ) {

		return;

	}

	if ( ! cacheOnly ) {

		tile.__used = true;
		renderer.stats.used ++;

	}

	renderer.markTileUsed( tile );

	if ( tile.__inFrustum === true ) {

		renderer.stats.inFrustum ++;

	}

}

// Returns whether the tile can be traversed to the next layer of children by checking the tile metrics
function canTraverse( tile, renderer ) {

	// If we've met the error requirements then don't load further - if an external tileset is encountered,
	// though, then continue to refine.
	if ( tile.__error <= renderer.errorTarget && ! canUnconditionallyRefine( tile ) ) {

		return false;

	}

	// Early out if we've reached the maximum allowed depth.
	if ( renderer.maxDepth > 0 && tile.__depth + 1 >= renderer.maxDepth ) {

		return false;

	}

	// Early out if the children haven't been processed, yet
	if ( ! areChildrenProcessed( tile ) ) {

		return false;

	}

	return true;

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

	if ( ! canTraverse( tile, renderer ) ) {

		markUsed( tile, renderer );
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

	// If none of the children are visible in the frustum then there should be no reason to display this tile. We still mark
	// this tile and all children as "used" only in the cache (but not loaded) so they are not disposed, causing an oscillation
	// / flicker in the content.
	if ( tile.refine === 'REPLACE' && ! anyChildrenInFrustum && children.length !== 0 ) {

		tile.__inFrustum = false;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer, true );

		}

		return;

	}

	// wait until after the above condition to mark the traversed tile as used or not
	markUsed( tile, renderer );

	// If this is a tile that needs children loaded to refine then recursively load child
	// tiles until error is met
	if ( tile.refine === 'REPLACE' && ( anyChildrenUsed && tile.__depth !== 0 || LOAD_ROOT_SIBLINGS ) ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer );

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

		let allChildrenReady = true;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			markUsedSetLeaves( c, renderer );

			if ( isUsedThisFrame( c, frameCount ) ) {

				// Compute whether this child is _allowed_ to display by checking the geometric error relative to the parent tile to avoid holes.
				// If the child's geometric error is less than or equal to the parent's (or it has unrenderable content), we should NOT display the child to avoid holes.
				// Only display the child if its geometric error is greater than the parent's and it has renderable content.
				// Note that this behavior is undocumented in the 3d tiles specification and tilesets designed to take advantage of it may not work as expected
				// in other rendering systems.
				// See issue NASA-AMMOS/3DTilesRendererJS#1304
				const childCanDisplay = ! canUnconditionallyRefine( c );

				// Consider a child to be ready to be displayed if
				// - the children's children have been loaded
				// - the tile content has loaded
				// - the tile is completely empty - ie has no children and no content
				// - the child tileset has tried to load but failed
				let isChildReady =
					! c.__hasContent ||
					( c.__hasRenderableContent && isDownloadFinished( c.__loadingState ) ) ||
					( c.__hasUnrenderableContent && c.__loadingState === FAILED );

				// Consider this child ready if it can be displayed and is ready for display or all of it's children ready to be displayed
				isChildReady = ( childCanDisplay && isChildReady ) || c.__allChildrenReady;

				allChildrenReady = allChildrenReady && isChildReady;

			}

		}

		tile.__allChildrenReady = allChildrenReady;

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
	if ( tile.__isLeaf ) {

		if ( tile.__loadingState === LOADED ) {

			if ( tile.__inFrustum ) {

				tile.__visible = true;
				stats.visible ++;

			}

			tile.__active = true;
			stats.active ++;

		} else if ( tile.__hasContent ) {

			renderer.queueTileForDownload( tile );

		}

		return;

	}

	const children = tile.children;
	const hasContent = tile.__hasContent;
	const loadedContent = isDownloadFinished( tile.__loadingState ) && hasContent;
	const errorRequirement = ( renderer.errorTarget + 1 ) * renderer.errorThreshold;
	const meetsSSE = tile.__error <= errorRequirement;
	const isAdditiveRefine = tile.refine === 'ADD';

	// TODO: the "meetsSSE" field can be removed when the "errorThreshold" field has been removed

	// Don't wait for all children tiles to load if this tileset has empty tiles at the root in order
	// to match Cesium's behavior
	const allChildrenReady = tile.__allChildrenReady || ( tile.__depth === 0 && ! LOAD_ROOT_SIBLINGS );

	// If we've met the SSE requirements and we can load content then fire a fetch.
	if ( hasContent && ( meetsSSE || isAdditiveRefine ) ) {

		renderer.queueTileForDownload( tile );

	}

	// By this time only tiles that meet the screen space error requirements will be traversed. Only mark this
	// as visible if it's been loaded and not all children have loaded yet or it's an additive tile, meaning it needs
	// to display in addition to the children.

	// Skip the tile entirely if there's no content to load
	if ( meetsSSE && loadedContent && ! allChildrenReady || loadedContent && isAdditiveRefine ) {

		if ( tile.__inFrustum ) {

			tile.__visible = true;
			stats.visible ++;

		}

		tile.__active = true;
		stats.active ++;

	}

	// If we're additive then don't stop the traversal here because it doesn't matter whether the children load in
	// at the same rate.
	if ( ! isAdditiveRefine && meetsSSE && ! allChildrenReady ) {

		// load the child content if we've found that we've been loaded so we can move down to the next tile
		// layer when the data has loaded.
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, renderer.frameCount ) ) {

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

		} else {

			// if the tile was used last frame but not this one then there's potential for the tile
			// to not have been visited during the traversal, meaning it hasn't been reset and has
			// stale values. This ensures the values are not stale.
			resetFrameState( tile, renderer );

		}

		// If the active or visible state changed then call the functions.
		if ( tile.__hasRenderableContent && tile.__loadingState === LOADED ) {

			if ( tile.__wasSetActive !== setActive ) {

				renderer.invokeOnePlugin( plugin => plugin.setTileActive && plugin.setTileActive( tile, setActive ) );

			}

			if ( tile.__wasSetVisible !== setVisible ) {

				renderer.invokeOnePlugin( plugin => plugin.setTileVisible && plugin.setTileVisible( tile, setVisible ) );

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
