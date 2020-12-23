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

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url : String, ionAccessToken : String );
	update() : void;
	traverse(
		beforeCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null,
		afterCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null
	) : void;
	dispose() : void;

}
