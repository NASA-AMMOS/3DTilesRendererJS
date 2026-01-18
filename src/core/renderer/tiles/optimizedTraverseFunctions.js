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

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

// Checks whether all children have been processed and are ready to traverse
function areChildrenProcessed( tile ) {

	return tile.__childrenProcessed === tile.children.length && ( ! tile.__hasUnrenderableContent || isDownloadFinished( tile.__loadingState ) );

}

// Checks whether we can stop at this tile for rendering or not
function canUnconditionallyRefine( tile ) {

	return tile.__hasUnrenderableContent || tile.geometricError > 1e90 || ( tile.parent && tile.parent.geometricError < tile.geometricError );

}

// Resets the frame information for the given tile
function resetFrameState( tile, renderer ) {

	renderer.ensureChildrenArePreprocessed( tile );

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
		tile.__kicked = false;
		tile.__allUsedChildrenProcessed = false;
		tile.__coverage = 0.0;
		tile.__visibleCoverage = 0.0;

		// update tile frustum and error state
		renderer.calculateTileViewError( tile, viewErrorTarget );
		tile.__inFrustum = viewErrorTarget.inView;
		tile.__error = viewErrorTarget.error;
		tile.__distanceFromCamera = viewErrorTarget.distanceFromCamera;

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

	if ( tile.__usedLastFrame ) {

		markUsed( tile, renderer );

		if ( tile.__wasSetActive ) {

			tile.__active = true;

		}

		if ( ! tile.__active || canUnconditionallyRefine( tile ) ) {

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

	tile.__used = true;

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

// Marks "active" children as "kicked" so they are still loaded but not rendered yet
function kickActiveChildren( tile, renderer ) {

	const { frameCount } = renderer;
	const { children } = tile;

	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			if ( c.__active ) {

				c.__kicked = true;
				c.__active = false;

			}

			kickActiveChildren( c, renderer );

		}

	}

}

// Checks whether this tile is ready to be stopped at for rendering
function isChildReady( tile ) {

	return ! canUnconditionallyRefine( tile ) && ( ! tile.__hasContent || isDownloadFinished( tile.__loadingState ) );

}

// Determine which tiles are used by the renderer given the current camera configuration
function markUsedTiles( tile, renderer ) {

	// determine frustum set is run first so we can ensure the preprocessing of all the necessary
	// child tiles has happened here.
	resetFrameState( tile, renderer );

	if ( ! tile.__inFrustum ) {

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

		tile.__isLeaf = true;

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			markUsedSetLeaves( children[ i ], renderer );

		}

	}

	// save whether any children are processed
	let allUsedChildrenProcessed = true;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, renderer.frameCount ) && ! c.__allUsedChildrenProcessed ) {

			allUsedChildrenProcessed = false;

		}

	}

	tile.__allUsedChildrenProcessed = allUsedChildrenProcessed && areChildrenProcessed( tile );

}

// TODO: revisit implementation
// Skip past tiles we consider unrenderable because they are outside the error threshold.
function markVisibleTiles( tile, renderer ) {

	if ( ! isUsedThisFrame( tile, renderer.frameCount ) ) {

		return;

	}

	const hasContent = tile.__hasContent;
	const loadedContent = isDownloadFinished( tile.__loadingState ) && hasContent;
	const children = tile.children;
	if ( tile.__isLeaf ) {

		// if we're allowed to stop at this tile then mark it as active and allow any previously active tiles to
		// continue to be displayed
		if ( ! canUnconditionallyRefine( tile ) ) {

			tile.__active = true;

			if ( areChildrenProcessed( tile ) && ( ! tile.__hasContent || ! isDownloadFinished( tile.__loadingState ) ) ) {

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

			const childIsReady = c.__active && isChildReady( c );
			if ( ! childIsReady && ! c.__allChildrenReady ) {

				allChildrenReady = false;

			}

		}

	}

	tile.__allChildrenReady = allChildrenReady;

	// If we find that the subsequent children are not ready such that this tile gap can be filled then
	// mark all lower tiles as non active and prepare this one to be displayed if possible
	const thisTileIsVisible = tile.__active && isChildReady( tile );
	if ( ! canUnconditionallyRefine( tile ) && ! allChildrenReady && ! thisTileIsVisible ) {

		if ( tile.__wasSetActive && ( loadedContent || ! tile.__hasContent ) ) {

			tile.__active = true;
			kickActiveChildren( tile, renderer );

		}

	}

}

// Final traverse to toggle tile visibility.
function toggleTiles( tile, renderer ) {

	const isUsed = isUsedThisFrame( tile, renderer.frameCount );
	if ( isUsed ) {

		// any internal tileset and additive tile must be marked as active and loaded
		if ( tile.__hasUnrenderableContent || tile.__hasRenderableContent && tile.refine === 'ADD' ) {

			tile.__active = true;

		}

		// queue any tiles to load that we need to, and unmark any unloaded or non visible tiles as "active"
		// TODO: it may be more simple to track a separate variable than "active" here
		if ( ( tile.__active || tile.__kicked ) && tile.__hasContent ) {

			renderer.markTileUsed( tile );

			if ( tile.__hasUnrenderableContent || tile.__allUsedChildrenProcessed ) {

				renderer.queueTileForDownload( tile );

			}

			if ( tile.__loadingState !== LOADED ) {

				tile.__active = false;

			}

		} else {

			tile.__active = false;

		}

		// if the tile is loaded and in frustum we can mark it as visible
		tile.__visible = tile.__hasRenderableContent && tile.__active && tile.__inFrustum && tile.__loadingState === LOADED;
		renderer.stats.used ++;

		if ( tile.__inFrustum ) {

			renderer.stats.inFrustum ++;

		}

	}

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

				renderer.stats.active += setActive ? 1 : - 1;
				renderer.invokeOnePlugin( plugin => plugin.setTileActive && plugin.setTileActive( tile, setActive ) );

			}

			if ( tile.__wasSetVisible !== setVisible ) {

				renderer.stats.visible += setVisible ? 1 : - 1;
				renderer.invokeOnePlugin( plugin => plugin.setTileVisible && plugin.setTileVisible( tile, setVisible ) );

			}

		}

		tile.__wasSetActive = setActive;
		tile.__wasSetVisible = setVisible;
		tile.__usedLastFrame = isUsed;

		const children = tile.children;
		let coverage = 0;
		let coverageChildren = 0;
		let visibleCoverageChildren = 0;
		let visibleCoverage = 0;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			toggleTiles( c, renderer );
			coverage += c.__coverage || 0;
			coverageChildren += c.__coverageChildren || 1;

			if ( c.__inFrustum ) {

				visibleCoverageChildren += c.__visibleCoverageChildren || 1;
				visibleCoverage += c.__visibleCoverage || 0;

			}

		}

		// TODO: it may be more simple to keep non-content tiles marked as "active" and fire "setVisible" and "setActive"
		// so plugins etc can react to empty tile visibility if desired
		if ( tile.__hasContent && ! canUnconditionallyRefine( tile ) || tile.__isLeaf ) {

			if ( tile.__hasContent && ! isDownloadFinished( tile.__loadingState ) ) {

				if ( tile.__active ) {

					tile.__coverage = 0;
					tile.__visibleCoverage = 0;

				} else {

					tile.__coverage = coverage / coverageChildren;
					tile.__visibleCoverage = visibleCoverage / visibleCoverageChildren;

				}

			} else {

				tile.__coverage = 1.0;
				tile.__visibleCoverage = tile.__inFrustum ? 1.0 : 0.0;

			}


		} else if ( tile.__refine === 'ADD' ) {

			tile.__coverage = 1.0;
			tile.__visibleCoverage = tile.__inFrustum ? 1.0 : 0.0;

		} else {

			tile.__coverage = coverage / coverageChildren;
			tile.__visibleCoverage = visibleCoverage / visibleCoverageChildren;

		}

	}

}

export function runTraversal( tile, renderer ) {

	markUsedTiles( tile, renderer );
	markUsedSetLeaves( tile, renderer );
	markVisibleTiles( tile, renderer );
	toggleTiles( tile, renderer );

}
