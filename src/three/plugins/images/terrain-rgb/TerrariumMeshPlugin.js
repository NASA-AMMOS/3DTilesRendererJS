import { TerrainRGBMeshPlugin } from './TerrainRGBMeshPlugin.js';

/**
 * {@link TerrainRGBMeshPlugin} for the Terrarium encoding.
 */
export class TerrariumMeshPlugin extends TerrainRGBMeshPlugin {

	constructor( options = {} ) {

		super( options );

		this.name = 'TERRARIUM_MESH_PLUGIN';

	}

	decodeElevation( r, g, b ) {

		return ( r * 256 + g + b / 256 ) - 32768;

	}

}
