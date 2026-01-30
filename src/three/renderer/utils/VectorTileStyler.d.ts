import { ColorRepresentation } from 'three';

export class VectorTileStyler {

	filter: ( feature: any, layerName: string ) => boolean;

	constructor( options?: {
		filter?: ( feature: any, layerName: string ) => boolean,
		styles?: { [ layerName: string ]: ColorRepresentation },
		layerOrder?: string[],
	} );

	getColor( layerName: string, format?: 'hex' | 'css' ): number | string;
	getLayerOrder(): string[];
	sortLayers( layerNames: string[] ): string[];
	shouldIncludeFeature( feature: any, layerName: string ): boolean;

}
