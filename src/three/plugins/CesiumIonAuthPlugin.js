import { CesiumIonAuthPlugin as CesiumIonAuthPluginImpl } from '../../plugins/index.js';

export class CesiumIonAuthPlugin extends CesiumIonAuthPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'CesiumIonAuthPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
