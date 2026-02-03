import { LOADED, FAILED } from '../constants.js';

const viewErrorTarget = {
	inView: false,
	error: Infinity,
	distanceFromCamera: Infinity,
};

function isDownloadFinished( value ) {

	return value === LOADED || value === FAILED;

}

// Checks whether this tile was last used on the given frame.
function isUsedThisFrame( tile, frameCount ) {

	return isProcessed( tile ) && tile.traversal.lastFrameVisited === frameCount && tile.traversal.used;

}

function isProcessed( tile ) {

	return Boolean( tile.traversal );

}

// Checks whether all children have been processed and are ready to traverse
function areChildrenProcessed( tile ) {

	// all children are processed at once
	const childrenReady = tile.children.length === 0 || Boolean( tile.children[ 0 ].internal );
	const contentReady = ! tile.internal.hasUnrenderableContent || isDownloadFinished( tile.internal.loadingState );
	return childrenReady && contentReady;

}

// Checks whether we can stop at this tile for rendering or not
function canUnconditionallyRefine( tile ) {

	return tile.internal.hasUnrenderableContent || ( tile.parent && tile.parent.geometricError < tile.geometricError );

}

// Resets the frame information for the given tile
function resetFrameState( tile, renderer ) {

	renderer.ensureChildrenArePreprocessed( tile );

	if ( tile.traversal.lastFrameVisited !== renderer.frameCount ) {

		tile.traversal.lastFrameVisited = renderer.frameCount;
		tile.traversal.used = false;
		tile.traversal.inFrustum = false;
		tile.traversal.isLeaf = false;
		tile.traversal.visible = false;
		tile.traversal.active = false;
		tile.traversal.error = Infinity;
		tile.traversal.distanceFromCamera = Infinity;
		tile.traversal.allChildrenReady = false;
		tile.traversal.kicked = false;
		tile.traversal.allUsedChildrenProcessed = false;

		// update tile frustum and error state
		renderer.calculateTileViewErrorWithPlugin( tile, viewErrorTarget );
		tile.traversal.inFrustum = viewErrorTarget.inView;
		tile.traversal.error = viewErrorTarget.error;
		tile.traversal.distanceFromCamera = viewErrorTarget.distanceFromCamera;

	}

}

// Recursively mark tiles used down to the next layer, skipping external tilesets
function recursivelyMarkUsed( tile, renderer, cacheOnly = false ) {

	resetFrameState( tile, renderer );
	if ( cacheOnly ) {

		renderer.markTileUsed( tile );

	} else {

		markUsed( tile );

	}

	// don't traverse if the children have not been processed, yet but tileset content
	// should be considered to be "replaced" by the loaded children so await that here.
	if ( canUnconditionallyRefine( tile ) && areChildrenProcessed( tile ) ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer, cacheOnly );

		}

	}

}

// Recursively mark tiles used down to the next layer, skipping external tilesets
function recursivelyMarkPreviouslyUsed( tile, renderer ) {

	resetFrameState( tile, renderer );

	if ( tile.traversal.usedLastFrame ) {

		markUsed( tile, renderer );

		if ( tile.traversal.wasSetActive ) {

			tile.traversal.active = true;

		}

		if ( ! tile.traversal.active || canUnconditionallyRefine( tile ) ) {

			// don't traverse if the children have not been processed, yet but tileset content
			// should be considered to be "replaced" by the loaded children so await that here.
			if ( areChildrenProcessed( tile ) ) {

				const children = tile.children;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					recursivelyMarkPreviouslyUsed( children[ i ], renderer );

				}

			}

		}

	}

}

// Mark a tile as being used by current view
function markUsed( tile ) {

	tile.traversal.used = true;

}

// Returns whether the tile can be traversed to the next layer of children by checking the tile metrics
function canTraverse( tile, renderer ) {

	// If we've met the error requirements then don't load further - if an external tileset is encountered,
	// though, then continue to refine.
	if ( tile.traversal.error <= renderer.errorTarget && ! canUnconditionallyRefine( tile ) ) {

		return false;

	}

	// Early out if we've reached the maximum allowed depth.
	if ( renderer.maxDepth > 0 && tile.internal.depth + 1 >= renderer.maxDepth ) {

		return false;

	}

	// Early out if the children haven't been processed, yet
	if ( ! areChildrenProcessed( tile ) ) {

		return false;

	}

	return true;

}

// Marks "active" children as "kicked" so they are still loaded but not rendered yet
function kickActiveChildren( tile, renderer ) {

	const { frameCount } = renderer;
	const { children } = tile;

	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			if ( c.traversal.active ) {

				c.traversal.kicked = true;
				c.traversal.active = false;

			}

			kickActiveChildren( c, renderer );

		}

	}

}

// Checks whether this tile is ready to be stopped at for rendering
function isChildReady( tile ) {

	return ! canUnconditionallyRefine( tile ) && ( ! tile.internal.hasContent || isDownloadFinished( tile.internal.loadingState ) );

}

// Determine which tiles are used by the renderer given the current camera configuration
function markUsedTiles( tile, renderer ) {

	// determine frustum set is run first so we can ensure the preprocessing of all the necessary
	// child tiles has happened here.
	resetFrameState( tile, renderer );

	if ( ! tile.traversal.inFrustum ) {

		return;

	}

	if ( ! canTraverse( tile, renderer ) ) {

		markUsed( tile );
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
		anyChildrenInFrustum = anyChildrenInFrustum || c.traversal.inFrustum;

	}

	// If none of the children are visible in the frustum then there should be no reason to display this tile. We still mark
	// this tile and all children as "used" only in the cache (but not loaded) so they are not disposed, causing an oscillation
	// / flicker in the content.
	if ( tile.refine === 'REPLACE' && ! anyChildrenInFrustum && children.length !== 0 ) {

		tile.traversal.inFrustum = false;

		renderer.markTileUsed( tile );
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer, true );

		}

		return;

	}

	// wait until after the above condition to mark the traversed tile as used or not
	// and then mark any of the sibling child tiles as used
	markUsed( tile );

	if ( tile.refine === 'REPLACE' && anyChildrenUsed && renderer.loadSiblings ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer );

		}

	}

}

// Traverse and mark the tiles that are at the leaf nodes of the "used" tree.
function markUsedSetLeaves( tile, renderer ) {

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

	// Traversal
	if ( ! anyChildrenUsed ) {

		tile.traversal.isLeaf = true;

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			markUsedSetLeaves( children[ i ], renderer );

		}

	}

	// save whether any children are processed
	let allUsedChildrenProcessed = true;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, renderer.frameCount ) && ! c.traversal.allUsedChildrenProcessed ) {

			allUsedChildrenProcessed = false;

		}

	}

	tile.traversal.allUsedChildrenProcessed = allUsedChildrenProcessed && areChildrenProcessed( tile );

}

// TODO: revisit implementation
// Skip past tiles we consider unrenderable because they are outside the error threshold.
function markVisibleTiles( tile, renderer ) {

	if ( ! isUsedThisFrame( tile, renderer.frameCount ) ) {

		return;

	}

	const hasContent = tile.internal.hasContent;
	const loadedContent = isDownloadFinished( tile.internal.loadingState ) && hasContent;
	const children = tile.children;
	if ( tile.traversal.isLeaf ) {

		// if we're allowed to stop at this tile then mark it as active and allow any previously active tiles to
		// continue to be displayed
		if ( ! canUnconditionallyRefine( tile ) ) {

			tile.traversal.active = true;

			if ( areChildrenProcessed( tile ) && ( ! tile.internal.hasContent || ! isDownloadFinished( tile.internal.loadingState ) ) ) {

				for ( let i = 0, l = children.length; i < l; i ++ ) {

					recursivelyMarkPreviouslyUsed( children[ i ], renderer );

				}

			}

		}

		return;

	}

	// Don't wait for all children tiles to load if this tileset has empty tiles at the root in order
	// to match Cesium's behavior
	let allChildrenReady = children.length > 0;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		markVisibleTiles( c, renderer );

		if ( isUsedThisFrame( c, renderer.frameCount ) ) {

			const childIsReady = c.traversal.active && isChildReady( c );
			if ( ! childIsReady && ! c.traversal.allChildrenReady ) {

				allChildrenReady = false;

			}

		}

	}

	tile.traversal.allChildrenReady = allChildrenReady;

	// If we find that the subsequent children are not ready such that this tile gap can be filled then
	// mark all lower tiles as non active and prepare this one to be displayed if possible
	const thisTileIsVisible = tile.traversal.active && isChildReady( tile );
	if ( ! canUnconditionallyRefine( tile ) && ! allChildrenReady && ! thisTileIsVisible ) {

		if ( tile.traversal.wasSetActive && ( loadedContent || ! tile.internal.hasContent ) ) {

			tile.traversal.active = true;
			kickActiveChildren( tile, renderer );

		}

	}

}

// Final traverse to toggle tile visibility.
function toggleTiles( tile, renderer ) {

	const isUsed = isUsedThisFrame( tile, renderer.frameCount );
	if ( isUsed ) {

		// any internal tileset and additive tile must be marked as active and loaded
		if ( tile.internal.hasUnrenderableContent || tile.internal.hasRenderableContent && tile.refine === 'ADD' ) {

			tile.traversal.active = true;

		}

		// queue any tiles to load that we need to, and unmark any unloaded or non visible tiles as "active"
		// TODO: it may be more simple to track a separate variable than "active" here
		if ( ( tile.traversal.active || tile.traversal.kicked ) && tile.internal.hasContent ) {

			renderer.markTileUsed( tile );

			if ( tile.internal.hasUnrenderableContent || tile.traversal.allUsedChildrenProcessed ) {

				renderer.queueTileForDownload( tile );

			}

			if ( tile.internal.loadingState !== LOADED ) {

				tile.traversal.active = false;

			}

		} else {

			tile.traversal.active = false;

		}

		// if the tile is loaded and in frustum we can mark it as visible
		tile.traversal.visible = tile.internal.hasRenderableContent && tile.traversal.active && tile.traversal.inFrustum && tile.internal.loadingState === LOADED;
		renderer.stats.used ++;

		if ( tile.traversal.inFrustum ) {

			renderer.stats.inFrustum ++;

		}

	}

	if ( isUsed || isProcessed( tile ) && tile.traversal?.usedLastFrame ) {

		let setActive = false;
		let setVisible = false;
		if ( isUsed ) {

			// enable visibility if active due to shadows
			setActive = tile.traversal.active;
			if ( renderer.displayActiveTiles ) {

				setVisible = tile.traversal.active || tile.traversal.visible;

			} else {

				setVisible = tile.traversal.visible;

			}

		} else {

			// if the tile was used last frame but not this one then there's potential for the tile
			// to not have been visited during the traversal, meaning it hasn't been reset and has
			// stale values. This ensures the values are not stale.
			resetFrameState( tile, renderer );

		}

		// If the active or visible state changed then call the functions.
		if ( tile.internal.hasRenderableContent && tile.internal.loadingState === LOADED ) {

			if ( tile.traversal.wasSetActive !== setActive ) {

				renderer.stats.active += setActive ? 1 : - 1;
				renderer.invokeOnePlugin( plugin => plugin.setTileActive && plugin.setTileActive( tile, setActive ) );

			}

			if ( tile.traversal.wasSetVisible !== setVisible ) {

				renderer.stats.visible += setVisible ? 1 : - 1;
				renderer.invokeOnePlugin( plugin => plugin.setTileVisible && plugin.setTileVisible( tile, setVisible ) );

			}

		}

		tile.traversal.wasSetActive = setActive;
		tile.traversal.wasSetVisible = setVisible;
		tile.traversal.usedLastFrame = isUsed;

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			toggleTiles( c, renderer );

		}

	}

}

export function runTraversal( tile, renderer ) {

	markUsedTiles( tile, renderer );
	markUsedSetLeaves( tile, renderer );
	markVisibleTiles( tile, renderer );
	toggleTiles( tile, renderer );

}
