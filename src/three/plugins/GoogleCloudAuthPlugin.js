import { GoogleCloudAuthPlugin as GoogleCloudAuthPluginImpl } from '3d-tiles-renderer/core/plugins';

export class GoogleCloudAuthPlugin extends GoogleCloudAuthPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GoogleCloudAuthPlugin: Plugin has been moved to "3d-tiles-renderer/core/plugins".' );

	}

}
