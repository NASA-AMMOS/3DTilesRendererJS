import { Tile } from './Tile';

/**
 * Internal state used/set by the package.
 */

export interface TileInternal extends Tile {

	// tile description
	__externalTileSet: boolean;
	__contentEmpty: boolean;
	__isLeaf: boolean;

	// resource tracking
	__usedLastFrame: boolean;
	__used: boolean;

	// Visibility tracking
	__allChildrenLoaded: boolean;
	__childrenWereVisible: boolean;
	__inFrustum: boolean;
	__wasSetVisible: boolean;

	// download state tracking
	/**
	 * This tile is currently active if:
	 *  1: Tile content is loaded and ready to be made visible if needed
	 */
	__active: boolean;
	__loadIndex: number;
	__loadAbort: AbortController | null;
	__loadingState: number;
	__wasSetActive: boolean;

}
