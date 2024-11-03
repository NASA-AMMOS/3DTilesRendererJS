import { CesiumIonAuthPlugin as CesiumIonAuthPluginImpl } from '3d-tiles-renderer/plugins';

export class CesiumIonAuthPlugin extends CesiumIonAuthPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'CesiumIonAuthPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
