import { ColorRepresentation, Texture } from 'three';
import { PMTiles } from 'pmtiles';
import { PMTilesLoaderBase } from '../../../../core/renderer/loaders/PMTilesLoaderBase.js';

export class PMTilesImageSource {

	readonly pmtilesLoader: PMTilesLoaderBase;
	readonly pmtilesUrl: string;
	readonly instance: PMTiles;

	constructor( options: {
		url: string,
		tileDimension?: number,
		filter?: ( feature: any, layerName: string ) => boolean,
		styles?: { [ layerName: string ]: ColorRepresentation },
		fetchOptions?: RequestInit,
	} );

	init(): Promise<void>;
	getUrl( x: number, y: number, level: number ): string;
	fetchItem( tokens: [ number, number, number ], signal?: AbortSignal ): Promise<Texture>;

}
