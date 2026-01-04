import { Tile } from './Tile.js';

/**
 * Internal state used/set by the package.
 * This interface is deprecated - fields have been reorganized into tile.internal and tile.traversal
 */

export interface TileInternal extends Tile {

	// Deprecated fields for backwards compatibility
	/** @deprecated Use tile.traversal.isLeaf instead */
	__isLeaf?: boolean;
	/** @deprecated Use tile.internal.hasContent instead */
	__hasContent?: boolean;
	/** @deprecated Use tile.internal.hasRenderableContent instead */
	__hasRenderableContent?: boolean;
	/** @deprecated Use tile.internal.hasUnrenderableContent instead */
	__hasUnrenderableContent?: boolean;

	/** @deprecated Use tile.traversal.usedLastFrame instead */
	__usedLastFrame?: boolean;
	/** @deprecated Use tile.traversal.used instead */
	__used?: boolean;

	/** @deprecated Use tile.traversal.allChildrenReady instead */
	__allChildrenReady?: boolean;
	/** @deprecated Use tile.traversal.inFrustum instead */
	__inFrustum?: boolean;
	/** @deprecated Use tile.traversal.wasSetVisible instead */
	__wasSetVisible?: boolean;

	/** @deprecated Use tile.traversal.active instead */
	__active?: boolean;
	__loadIndex?: number;
	__loadAbort?: AbortController | null;
	/** @deprecated Use tile.internal.loadingState instead */
	__loadingState?: number;
	/** @deprecated Use tile.traversal.wasSetActive instead */
	__wasSetActive?: boolean;

}
