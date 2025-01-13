import { LRUCache } from '../utilities/LRUCache';
import { PriorityQueue } from '../utilities/PriorityQueue';

export class TilesRendererBase {

	readonly rootTileSet : object | null;
	readonly root : object | null;

	errorTarget : number;
	errorThreshold : number;
	displayActiveTiles : boolean;
	maxDepth : number;

	loadProgress: number;

	fetchOptions : RequestInit;
	preprocessURL : ( ( uri: string | URL ) => string ) | null;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url?: string );
	update() : void;
	registerPlugin( plugin: object ) : void;
	unregisterPlugin( plugin: object | string ) : boolean;
	getPluginByName( plugin: object | string ) : object;
	traverse(
		beforeCb : ( ( tile : object, parent : object, depth : number ) => boolean ) | null,
		afterCb : ( ( tile : object, parent : object, depth : number ) => boolean ) | null
	) : void;
	getAttributions( target? : Array<{ type: string, value: any }> ) : Array<{ type: string, value: any }>;

	dispose() : void;
	resetFailedTiles() : void;

}
