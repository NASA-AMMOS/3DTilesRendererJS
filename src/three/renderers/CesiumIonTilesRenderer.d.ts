import { TilesRenderer } from '../TilesRenderer';
import { DebugTilesRenderer } from '../DebugTilesRenderer';

export class CesiumIonTilesRenderer extends TilesRenderer {

	constructor( ionAssetId: string, ionAccessToken: string );

}

export class DebugCesiumIonTilesRenderer extends DebugTilesRenderer {

	constructor( ionAssetId: string, ionAccessToken: string );

}
