import { GLTFStructuralMetadataExtension as GLTFStructuralMetadataExtensionImpl } from '3d-tiles-renderer/plugins';

export class GLTFStructuralMetadataExtension extends GLTFStructuralMetadataExtensionImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GLTFStructuralMetadataExtension: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
