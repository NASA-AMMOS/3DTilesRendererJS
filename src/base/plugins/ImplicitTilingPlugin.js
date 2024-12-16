import { ImplicitTilingPlugin as ImplicitTilingPluginImpl } from '3d-tiles-renderer/plugins';

export class ImplicitTilingPlugin extends ImplicitTilingPluginImpl {

	constructor() {

		super();
		console.warn( 'ImplicitTilingPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
