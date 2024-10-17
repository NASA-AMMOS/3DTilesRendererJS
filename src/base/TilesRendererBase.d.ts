import { LRUCache } from '../utilities/LRUCache';
import { PriorityQueue } from '../utilities/PriorityQueue';

export class TilesRendererBase {

	readonly rootTileSet : Object | null;
	readonly root : Object | null;

	errorTarget : Number;
	errorThreshold : Number;
	displayActiveTiles : Boolean;
	maxDepth : Number;

	fetchOptions : RequestInit;
	preprocessURL : ( ( uri: string | URL ) => string ) | null;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url?: String );
	update() : void;
	registerPlugin( plugin: Object ) : void;
	unregisterPlugin( plugin: Object | String ) : Boolean;
	getPluginByName( plugin: Object | String ) : Object;
	traverse(
		beforeCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null,
		afterCb : ( ( tile : Object, parent : Object, depth : Number ) => Boolean ) | null
	) : void;
	getAttributions( target? : Array<{ type: String, value: any }> ) : Array<{ type: String, value: any }>;

	dispose() : void;
	resetFailedTiles() : void;

}
