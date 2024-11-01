import { GLTFStructuralMetadataExtension as GLTFStructuralMetadataExtensionImpl } from '../../../plugins/index.js';

export class GLTFStructuralMetadataExtension extends GLTFStructuralMetadataExtensionImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GLTFStructuralMetadataExtension: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
