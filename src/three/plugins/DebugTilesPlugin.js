import { DebugTilesPlugin as DebugTilesPluginImpl } from '../../plugins/three/DebugTilesPlugin.js';

export class DebugTilesPlugin extends DebugTilesPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'DebugTilesPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
