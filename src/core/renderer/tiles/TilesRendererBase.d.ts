import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';
import { Tile } from './Tile.js';
import { Tileset } from './Tileset.js';

// Events dispatched by TilesRendererBase, available across all renderer implementations.
export interface TilesRendererBaseEventMap<TScene = unknown> {
	'needs-update': {};
	'load-content': {};
	'load-tileset': { tileset : Tileset, /* @deprecated Use tileset instead */ tileSet? : Tileset, url : string };
	/* @deprecated Use 'load-tileset' instead */
	'load-tile-set': { tileset : Tileset, /* @deprecated Use tileset instead */ tileSet? : Tileset, url : string };
	'load-root-tileset': { tileset : Tileset, url : string };
	'tiles-load-start': {};
	'tiles-load-end': {};
	'tile-download-start': { tile : Tile, uri : string };
	'load-model': { scene : TScene, tile : Tile, url : string };
	'dispose-model': { scene : TScene, tile : Tile };
	'tile-visibility-change': { scene : TScene, tile : Tile, visible : boolean };
	'update-before': {};
	'update-after': {};
	'load-error': { tile : Tile | null, error : Error, url : string | URL };
}

export class TilesRendererBase<TEventMap extends TilesRendererBaseEventMap = TilesRendererBaseEventMap> {

	readonly rootTileset : Tileset | null;
	/** @deprecated Use rootTileset instead */
	readonly rootTileSet : Tileset | null;
	readonly root : Tile | null;
	readonly visibleTiles : Set<Tile>;
	readonly activeTiles : Set<Tile>;

	errorTarget : number;
	errorThreshold : number;
	displayActiveTiles : boolean;
	maxDepth : number;
	loadSiblings : boolean;
	loadParents : boolean;
	optimizedLoadStrategy : boolean;
	maxTilesProcessed : number;

	readonly loadProgress : number;

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

	addEventListener<T extends keyof TEventMap>(
		name : T,
		callback : ( event : TEventMap[ T ] & { type : T } ) => void
	) : void;
	addEventListener( name : string, callback : ( event : any ) => void ) : void;

	removeEventListener<T extends keyof TEventMap>(
		name : T,
		callback : ( event : TEventMap[ T ] & { type : T } ) => void
	) : void;
	removeEventListener( name : string, callback : ( event : any ) => void ) : void;

	hasEventListener<T extends keyof TEventMap>(
		name : T,
		callback : ( event : TEventMap[ T ] & { type : T } ) => void
	) : boolean;
	hasEventListener( name : string, callback : ( event : any ) => void ) : boolean;

	dispatchEvent<T extends keyof TEventMap>( event : TEventMap[ T ] & { type : T } ) : void;
	dispatchEvent( event : { type : string } ) : void;

	dispose() : void;
	resetFailedTiles() : void;

}
