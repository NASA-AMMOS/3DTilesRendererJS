import { PMTiles, Header } from 'pmtiles';

export class PMTilesLoaderBase {

	instance: PMTiles | null;
	header: Header | null;
	url: string | null;

	constructor();

	init( url: string ): Promise<Header>;
	getTile( z: number, x: number, y: number, signal?: AbortSignal ): Promise<ArrayBuffer | null>;
	getUrl( z: number, x: number, y: number ): string;

	static parseUrl( url: string ): { z: number, x: number, y: number };

}
