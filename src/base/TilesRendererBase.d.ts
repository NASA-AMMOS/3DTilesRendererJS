import { LRUCache } from '../utilities/LRUCache';
import { PriorityQueue } from '../utilities/PriorityQueue';
import { Tileset } from './Tileset';

export class TilesRendererBase {

	readonly rootTileset : Tileset | null;
	readonly root : Object | null;

	errorTarget : Number;
	errorThreshold : Number;
	loadSiblings : Boolean;
	displayActiveTiles : Boolean;
	maxDepth : Number;
	stopAtEmptyTiles : Boolean;

	fetchOptions : Object;
	/** function to preprocess the url for each individual tile */
	preprocessURL : ((uri: string | URL) => string) | null;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url : String );
	update() : void;
	traverse(
		beforeCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null,
		afterCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null
	) : void;
	dispose() : void;

}

/** Documented 3d-tile state managed by the TilesRenderer* / traverseFunctions! */
export interface Tile {

	/**
	 * Hierarchy Depth from the TileGroup
	 */
	__depth : Number;
	/**
	 * The screen space error for this tile
	 */
	__error : Number;
	/**
	 * How far is this tiles bounds from the nearest active Camera.
	 * Expected to be filled in during calculateError implementations.
	 */
	 __distanceFromCamera : Number;
	/**
	 * This tile is currently active if:
	 *  1: Tile content is loaded and ready to be made visible if needed
	 */
	__active : Boolean;
	/**
	 * This tile is currently visible if:
	 *  1: Tile content is loaded
	 *  2: Tile is within a camera frustum
	 *  3: Tile meets the SSE requirements
	 */
	 __visible : Boolean;
	/**
	 * Frame number that this tile was last used: active+visible
	 */
	 __lastFrameVisited : Number;
	/**
	 * TODO: Document this if it is useful enough to be the default property in the LRU sorting.
	 */
	 __depthFromRenderedParent : Number;

}
