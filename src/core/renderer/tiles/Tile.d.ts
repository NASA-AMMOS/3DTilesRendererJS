import { TileBase } from './TileBase.js';

/**
 * Internal implementation details for tile management
 */
export interface TileInternalData {
	hasContent: boolean;
	hasRenderableContent: boolean;
	hasUnrenderableContent: boolean;
	loadingState: number;
	basePath: string;
	depth: number;
	depthFromRenderedParent: number;
}

/**
 * Traversal state data updated during each frame's tile traversal
 */
export interface TileTraversalData {
	/**
	 * How far this tile's bounds are from the nearest active camera.
	 * Expected to be filled in during calculateError implementations.
	 */
	distanceFromCamera: number;
	/**
	 * The screen space error for this tile
	 */
	error: number;
	/**
	 * Whether or not the tile was within the frustum on the last update run
	 */
	inFrustum: boolean;
	/**
	 * Whether this tile is a leaf node in the used tree
	 */
	isLeaf: boolean;
	/**
	 * Whether or not the tile was visited during the last update run
	 */
	used: boolean;
	/**
	 * Whether or not the tile was used in the previous frame
	 */
	usedLastFrame: boolean;
	/**
	 * This tile is currently visible if:
	 *  1: Tile content is loaded
	 *  2: Tile is within a camera frustum
	 *  3: Tile meets the SSE requirements
	 */
	visible: boolean;
}

/**
 * Documented 3d-tile state managed by the TilesRenderer* / used/usable in priority / traverseFunctions!
 */
export interface Tile extends TileBase {

	parent: Tile;

	// Internal implementation details for tile management
	internal: TileInternalData;

	// Traversal state data updated during each frame's tile traversal
	traversal: TileTraversalData;

}
