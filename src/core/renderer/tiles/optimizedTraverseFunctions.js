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

function areChildrenProcessed( tile ) {

	return tile.__childrenProcessed === tile.children.length && ( ! tile.__hasUnrenderableContent || isDownloadFinished( tile.__loadingState ) );

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
		tile.__allChildrenVisible = false;
		tile.__kicked = false;
		tile.__allUsedChildrenProcessed = false;

		// update tile frustum and error state
		renderer.calculateTileViewError( tile, viewErrorTarget );
		tile.__inFrustum = viewErrorTarget.inView;
		tile.__error = viewErrorTarget.error;
		tile.__distanceFromCamera = viewErrorTarget.distanceFromCamera;

	}

}

// Recursively mark tiles used down to the next layer, skipping external tilesets
function recursivelyMarkUsed( tile, renderer, includeCache = false ) {

	renderer.ensureChildrenArePreprocessed( tile );

	resetFrameState( tile, renderer );
	markUsed( tile );
	if ( includeCache ) {

		renderer.markTileUsed( tile );

	}

	// don't traverse if the children have not been processed, yet but tileset content
	// should be considered to be "replaced" by the loaded children so await that here.
	if ( canUnconditionallyRefine( tile ) && areChildrenProcessed( tile ) ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], renderer, includeCache );

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
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		recursivelyMarkUsed( children[ i ], renderer );

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

	// save whether any children are processed
	let allUsedChildrenProcessed = true;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, renderer.frameCount ) && ! c.__allUsedChildrenProcessed ) {

			allUsedChildrenProcessed = false;

		}

	}

	tile.__allUsedChildrenProcessed = allUsedChildrenProcessed;

}

// TODO: revisit implementation
// Skip past tiles we consider unrenderable because they are outside the error threshold.
export function markVisibleTiles( tile, renderer ) {

	if ( ! isUsedThisFrame( tile, renderer.frameCount ) ) {

		return;

	}

	const hasContent = tile.__hasContent;
	const loadedContent = isDownloadFinished( tile.__loadingState ) && hasContent;
	const children = tile.children;
	if ( tile.__isLeaf ) {

		if ( ! canUnconditionallyRefine( tile ) ) {

			if ( tile.__hasContent ) {

				tile.__active = true;

			}

			// TODO: tiles should never end at an "unconditionally refine-able tiles" so we can guard this
			// behind checking if this tile should be "visible" and loaded and if if it's not then we can
			// continue to load previously active tiles
			if ( areChildrenProcessed( tile ) && ( ! tile.__hasContent || ! isDownloadFinished( tile.__loadingState ) ) ) {

				for ( let i = 0, l = children.length; i < l; i ++ ) {

					recursivelyMarkPreviouslyUsed( children[ i ], renderer );

				}

			}

		}


		tile.__thisIsVisible = tile.__active && ! canUnconditionallyRefine( tile ) && ( ! tile.__hasContent || isDownloadFinished( tile.__loadingState ) );
		return;

	}

	// Don't wait for all children tiles to load if this tileset has empty tiles at the root in order
	// to match Cesium's behavior
	let allChildrenVisible = children.length > 0;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		markVisibleTiles( c, renderer );

		if ( isUsedThisFrame( c, renderer.frameCount ) ) {

			if ( ! c.__thisIsVisible && ! c.__allChildrenVisible ) {

				allChildrenVisible = false;

			}

		}

	}

	tile.__allChildrenVisible = allChildrenVisible;
	tile.__thisIsVisible = tile.__active && ! canUnconditionallyRefine( tile ) && ( ! tile.__hasContent || isDownloadFinished( tile.__loadingState ) );

	if ( ! canUnconditionallyRefine( tile ) && ! allChildrenVisible && ! tile.__thisIsVisible ) {

		if ( tile.__wasSetActive && ( loadedContent || ! tile.__hasContent ) ) {

			tile.__active = true;
			tile.__thisIsVisible = true;
			kickActiveChildren( tile, renderer );

		}

	}

}

// Final traverse to toggle tile visibility.
export function toggleTiles( tile, renderer ) {

	const isUsed = isUsedThisFrame( tile, renderer.frameCount );
	if ( isUsed ) {

		// any internal tileset must be marked as active and loaded
		if ( tile.__hasUnrenderableContent ) {

			tile.__active = true;

		}

		// queue any tiles to load that we need to
		// TODO: we'll need to ensure any lower level children that were "unmarked" also need to be queued for load. We can mark them as
		// "kicked" so they can be accounted for later
		if ( ( tile.__active || tile.__kicked ) && tile.__hasContent ) {

			renderer.markTileUsed( tile );

			if ( tile.__allUsedChildrenProcessed ) {

				renderer.queueTileForDownload( tile );

			}

			if ( tile.__loadingState !== LOADED ) {

				tile.__active = false;

			}

		}

		// if the tile is loaded and in frustum we can mark it as visible
		tile.__visible = tile.__hasRenderableContent && tile.__active && tile.__inFrustum && tile.__loadingState === LOADED;
		renderer.stats.traversed ++;

		if ( tile.__inFrustum ) {

			renderer.stats.inFrustum ++;

		}

		// TODO: if isLeaf and we can't load any tiles then we need to continue to traverse if
		// a tile was loaded or was rendered. We can keep track of whether a parent tile is
		// loaded so we can know whether to traverse or not

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
