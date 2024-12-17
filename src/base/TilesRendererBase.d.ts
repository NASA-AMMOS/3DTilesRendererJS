import { LRUCache } from '../utilities/LRUCache';
import { PriorityQueue } from '../utilities/PriorityQueue';
import { Tile } from './Tile';

export type Attribution =
	| { type: 'string'; value: string }
	| { type: 'html'; value: string }
	| { type: 'image'; value: string };

export interface TilesRendererBasePlugin {
	init?: ( renderer: TilesRendererBase ) => void;

	fetchData?: ( url: RequestInfo, options: RequestInit ) => Promise<Response>;
	parseTile?: ( content: ArrayBuffer | DataView, tile: Tile, extension: string, uri: string ) => Promise<void>;
	preprocessURL?: ( uri: string ) => string;
	preprocessNode?: ( tile: Tile, tileSetDir: string, parentTile: Tile | null ) => void;
	loadRootTileSet?: () => Promise<void>;
	disposeTile?: ( tile: Tile ) => void;
	getAttributions?: ( target: Attribution[] ) => void;

	dispose?: () => void;
}

export class TilesRendererBase<TPlugin extends TilesRendererBasePlugin = TilesRendererBasePlugin> {

	readonly rootTileSet : object | null;
	readonly root : object | null;

	errorTarget : number;
	errorThreshold : number;
	displayActiveTiles : boolean;
	maxDepth : number;

	fetchOptions : RequestInit;
	preprocessURL : ( ( uri: string | URL ) => string ) | null;

	lruCache : LRUCache;
	parseQueue : PriorityQueue;
	downloadQueue : PriorityQueue;

	constructor( url?: string );
	update() : void;
	registerPlugin( plugin: TPlugin ) : void;
	unregisterPlugin( plugin: TPlugin | string ) : boolean;
	getPluginByName( plugin: string ) : TPlugin;
	traverse(
		beforeCb : ( ( tile : object, parent : object, depth : number ) => boolean ) | null,
		afterCb : ( ( tile : object, parent : object, depth : number ) => boolean ) | null
	) : void;
	getAttributions( target? : Array<{ type: string, value: any }> ) : Array<{ type: string, value: any }>;

	dispose() : void;
	resetFailedTiles() : void;

}
