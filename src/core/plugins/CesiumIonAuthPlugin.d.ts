import { TilesRendererBase } from '3d-tiles-renderer/core';

export class CesiumIonAuthPlugin {

	constructor( options : {
		apiToken: string,
		assetId?: string | null,
		autoRefreshToken?: boolean,
		useRecommendedSettings?: boolean,
		assetTypeHandler?: ( type: string, tiles: TilesRendererBase, asset: object ) => void,
	} );

}
