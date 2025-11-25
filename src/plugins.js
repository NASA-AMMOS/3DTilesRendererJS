// Export all core plugins
export * from '3d-tiles-renderer/core/plugins';

// Export all three.js plugins
export * from '3d-tiles-renderer/three/plugins';

// Override with backward compatible version (no constructor warning)
import { CesiumIonAuthPlugin as CesiumIonAuthPluginDeprecated } from '3d-tiles-renderer/three/plugins';
export class CesiumIonAuthPlugin extends CesiumIonAuthPluginDeprecated {

	constructor( options ) {

		super( {
			...options,
			__suppress_warning__: true,
		} );

	}

}
