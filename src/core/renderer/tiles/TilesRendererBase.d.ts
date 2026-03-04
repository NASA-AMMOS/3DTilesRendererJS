import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';

export class TilesRendererBase {

	readonly rootTileset : object | null;
	/** @deprecated Use rootTileset instead */
	readonly rootTileSet : object | null;
	readonly root : object | null;
	readonly visibleTiles: Set<object>;
	readonly activeTiles: Set<object>;

	errorTarget : number;
	errorThreshold : number;
	displayActiveTiles : boolean;
	maxDepth : number;
	loadSiblings : boolean;
	optimizedLoadStrategy : boolean;
	maxTilesProcessed : number;

	loadProgress: number;

	fetchOptions : RequestInit;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;
	processNodeQueue: PriorityQueue;

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

	addEventListener( name: string, callback: ( event: any ) => void ): void;
	removeEventListener( name: string, callback: ( event: any ) => void ): void;

	dispose() : void;
	resetFailedTiles() : void;

}
