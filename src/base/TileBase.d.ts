/**
 * 3d-tiles Tile object per spec:
 * (incomplete, expanding as features become supported by this package.)
 *
 * See spec for full schema: https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tile.schema.json
 */
export interface TileBase {

	boundingVolume: {

		/**
		 * An array of 12 numbers that define an oriented bounding box. The first three elements define the x, y, and z
		 * values for the center of the box. The next three elements (with indices 3, 4, and 5) define the x axis
		 * direction and half-length. The next three elements (indices 6, 7, and 8) define the y axis direction and
		 * half-length. The last three elements (indices 9, 10, and 11) define the z axis direction and half-length.
		 */
		box?: number[];

		/**
		 * An array of four numbers that define a bounding sphere. The first three elements define the x, y, and z
		 * values for the center of the sphere. The last element (with index 3) defines the radius in meters.
		 */
		sphere?: number[];

	};

	/**
	 * The error, in meters, introduced if this tileset is not rendered. At runtime, the geometric error is used to compute screen space error (SSE), i.e., the error measured in pixels.
	 */
	geometricError: number;

	// optional properties

	children?: TileBase[];

	content?: {

		uri: string;

		/**
		 * Dictionary object with content specific extension objects.
		 */
		extensions?: Record<string, any>;

		extras?: Record<string, any>;

		// Non standard, noted here as it exists in the code in this package to support old pre-1.0 tilesets
		url?: string;

	};


	/**
	 * Dictionary object with tile specific extension objects.
	 */
	extensions?: Record<string, any>;

	extras?: Record<string, any>;

	refine?: 'REPLACE' | 'ADD';

	transform?: number[];

}
