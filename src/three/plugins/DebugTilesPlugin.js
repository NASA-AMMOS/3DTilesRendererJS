import { DebugTilesPlugin as DebugTilesPluginImpl } from '../../plugins/three/DebugTilesPlugin.js';

export {
	NONE,
	SCREEN_ERROR,
	GEOMETRIC_ERROR,
	DISTANCE,
	DEPTH,
	RELATIVE_DEPTH,
	IS_LEAF,
	RANDOM_COLOR,
	RANDOM_NODE_COLOR,
	CUSTOM_COLOR,
	LOAD_ORDER,
} from '../../plugins/three/DebugTilesPlugin.js';

export class DebugTilesPlugin extends DebugTilesPluginImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'DebugTilesPlugin: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
