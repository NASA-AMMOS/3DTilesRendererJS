import { TilesRenderer } from '../TilesRenderer';
import { DebugTilesRenderer } from '../DebugTilesRenderer';

export class CesiumIonTilesRenderer extends TilesRenderer {

	constructor( ionAssetId: String, ionAccessToken: String );

}

export class DebugCesiumIonTilesRenderer extends DebugTilesRenderer {

	constructor( ionAssetId: String, ionAccessToken: String );

}
