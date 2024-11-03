import { GoogleCloudAuthPlugin as GoogleCloudAuthPluginImpl } from '3d-tiles-renderer/plugins';

export class GoogleCloudAuthPlugin extends GoogleCloudAuthPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GoogleCloudAuthPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
