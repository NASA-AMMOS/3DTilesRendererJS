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

	fetchOptions : Object;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url : String );
	update() : void;
	traverse(
		beforeCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null,
		afterCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null
	) : void;

}
