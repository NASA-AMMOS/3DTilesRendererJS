import { TileBase } from './TileBase';

/**
 * A 3d-tiles tileset.
 *
 * Schema, see: https://github.com/CesiumGS/3d-tiles/blob/main/specification/schema/tileset.schema.json
 */
export interface Tileset {

	/**
	 * Metadata about the entire tileset.
	 */
	asset: {

		/**
		 * 3d-tiles version
		 */
		version: string,

		/**
		 * Application specific version
		 */
		tilesetVersion?: string,

		/**
		 * Dictionary object with extension-specific objects.
		 */
		extensions? : Record<string, any>,

	};

	/**
	 * The error, in meters, introduced if this tileset is not rendered. At runtime, the geometric error is used to compute screen space error (SSE), i.e., the error measured in pixels.
	 */
	geometricError: Number;

	/**
	 * The root tile.
	 */
	root: TileBase;

	// optional properties

	/**
	 * Names of 3D Tiles extensions used somewhere in this tileset.
	 */
	extensionsUsed?: string[];

	/**
	 * Names of 3D Tiles extensions required to properly load this tileset.
	 */
	extensionsRequired?: string[];

	/**
	 * A dictionary object of metadata about per-feature properties.
	 */
	properties?: Record<string, any>;

	/**
	 * Dictionary object with extension-specific objects.
	 */
	extensions? : Record<string, any>;

	extras? : Record<string, any>;

}
