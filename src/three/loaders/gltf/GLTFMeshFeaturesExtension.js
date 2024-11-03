import { GLTFMeshFeaturesExtension as GLTFMeshFeaturesExtensionImpl } from '3d-tiles-renderer/plugins';

export class GLTFMeshFeaturesExtension extends GLTFMeshFeaturesExtensionImpl {

	constructor( ...args ) {

		super( ...args );
		console.warn( 'GLTFMeshFeaturesExtension: Plugins should now be imported from "3d-tiles-renderer/plugins" path.' );

	}

}
