import { TileBase } from './TileBase.js';

/**
 * Internal implementation details for tile management
 */
export interface TileInternalData {
	/**
	 * Whether the tile has content to load
	 */
	hasContent: boolean;
	/**
	 * Whether the tile has renderable content (as opposed to just metadata or external tilesets)
	 */
	hasRenderableContent: boolean;
	/**
	 * Whether the tile has unrenderable content (external tilesets, metadata only, etc)
	 */
	hasUnrenderableContent: boolean;
	/**
	 * The current loading state of the tile
	 */
	loadingState: number;
	/**
	 * The base path for loading tile content
	 */
	basePath: string;
	/**
	 * Number of children that have been preprocessed
	 */
	childrenProcessed: number;
	/**
	 * Hierarchy depth from the TileGroup
	 */
	depth: number;
	/**
	 * The depth of the tiles that increments only when a child with geometry content is encountered
	 */
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
	/**
	 * The visible state that was set for this tile in the last update
	 */
	wasSetVisible: boolean;
	/**
	 * This tile is currently active if:
	 *  1: Tile content is loaded and ready to be made visible if needed
	 */
	active: boolean;
	/**
	 * The active state that was set for this tile in the last update
	 */
	wasSetActive: boolean;
	/**
	 * Whether all children of this tile are ready to be displayed
	 */
	allChildrenReady: boolean;
	/**
	 * The frame number when this tile was last visited
	 */
	lastFrameVisited: number;
}

/**
 * Documented 3d-tile state managed by the TilesRenderer* / used/usable in priority / traverseFunctions!
 */
export interface Tile extends TileBase {

	parent: Tile;

	/**
	 * Internal implementation details for tile management
	 */
	internal: TileInternalData;

	/**
	 * Traversal state data updated during each frame's tile traversal
	 */
	traversal: TileTraversalData;

	// Backwards compatibility - deprecated, use tile.internal.depth instead
	/** @deprecated Use tile.internal.depth instead */
	__depth?: number;
	/** @deprecated Use tile.traversal.error instead */
	__error?: number;
	/** @deprecated Use tile.traversal.distanceFromCamera instead */
	__distanceFromCamera?: number;
	/** @deprecated Use tile.traversal.active instead */
	__active?: boolean;
	/** @deprecated Use tile.traversal.visible instead */
	__visible?: boolean;
	/** @deprecated Use tile.traversal.used instead */
	__used?: boolean;
	/** @deprecated Use tile.traversal.inFrustum instead */
	__inFrustum?: boolean;
	/** @deprecated Use tile.internal.depthFromRenderedParent instead */
	__depthFromRenderedParent?: number;

}
