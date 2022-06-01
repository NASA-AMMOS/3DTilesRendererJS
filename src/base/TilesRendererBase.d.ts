import { LRUCache } from '../utilities/LRUCache';
import { PriorityQueue } from '../utilities/PriorityQueue';

export class TilesRendererBase {

	readonly rootTileset : Object | null;
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
	resetFailedTiles() : void;

}
