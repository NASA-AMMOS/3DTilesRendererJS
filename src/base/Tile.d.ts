import { TileBase } from './TileBase';

/**
 * Documented 3d-tile state managed by the TilesRenderer* / used/usable in priority / traverseFunctions!
 */
export interface Tile extends TileBase {

	parent: Tile;

	/**
	 * Hierarchy Depth from the TileGroup
	 */
	__depth : number;
	/**
	 * The screen space error for this tile
	 */
	__error : number;
	/**
	 * How far is this tiles bounds from the nearest active Camera.
	 * Expected to be filled in during calculateError implementations.
	 */
	__distanceFromCamera : number;
	/**
	 * This tile is currently active if:
	 *  1: Tile content is loaded and ready to be made visible if needed
	 */
	__active : boolean;
	/**
	 * This tile is currently visible if:
	 *  1: Tile content is loaded
	 *  2: Tile is within a camera frustum
	 *  3: Tile meets the SSE requirements
	 */
	__visible : boolean;
	/**
	 * Whether or not the tile was visited during the last update run.
	 */
	__used : boolean;

	/**
	 * Whether or not the tile was within the frustum on the last update run.
	 */
	__inFrustum : boolean;

	/**
	 * The depth of the tiles that increments only when a child with geometry content is encountered
	 */
	__depthFromRenderedParent : number;

}
