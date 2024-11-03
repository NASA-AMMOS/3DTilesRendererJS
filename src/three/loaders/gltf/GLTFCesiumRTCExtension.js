import { GLTFCesiumRTCExtension as GLTFCesiumRTCExtensionImpl } from '3d-tiles-renderer/plugins';

export class GLTFCesiumRTCExtension extends GLTFCesiumRTCExtensionImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GLTFCesiumRTCExtension: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
