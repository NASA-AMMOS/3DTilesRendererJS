import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';
import { CesiumIonAuthPlugin } from '../plugins/CesiumIonAuthPlugin.js';

const CesiumIonTilesRendererMixin = base => class extends base {

	constructor( ionAssetId, ionAccessToken ) {

		super();

		this.registerPlugin( new CesiumIonAuthPlugin( { apiToken: ionAccessToken, assetId: ionAssetId } ) );
		console.warn( 'CesiumIonTilesRenderer: Class has been deprecated. Use "TilesRenderer" with "CesiumIonAuthPlugin" instead.' );

	}

};

export const CesiumIonTilesRenderer = CesiumIonTilesRendererMixin( TilesRenderer );
export const DebugCesiumIonTilesRenderer = CesiumIonTilesRendererMixin( DebugTilesRenderer );


