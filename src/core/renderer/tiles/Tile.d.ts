/**
 * Internal implementation details for tile management
 */
export interface TileInternalData {
	hasContent: boolean;
	hasRenderableContent: boolean;
	hasUnrenderableContent: boolean;
	loadingState: number;
	basePath: string;
	depth: number;
	depthFromRenderedParent: number;
	/**
	 * Whether this tile was synthetically based on loaded parent tile state.
	 */
	isVirtual: boolean;
	/**
	 * The number of virtual children appended to this tile's children array by plugins.
	 */
	virtualChildCount: number;
}

/**
 * Traversal state data updated during each frame's tile traversal
 */
export interface TileTraversalData {
	/**
	 * How far this tile's bounds are from the nearest active camera.
	 * Expected to be filled in during calculateError implementations.
	 */
	distanceFromCamera: number;
	/**
	 * The screen space error for this tile
	 */
	error: number;
	/**
	 * Whether or not the tile was within the frustum on the last update run
	 */
	inFrustum: boolean;
	/**
	 * Whether this tile is a leaf node in the used tree
	 */
	isLeaf: boolean;
	/**
	 * Whether or not the tile was visited during the last update run
	 */
	used: boolean;
	/**
	 * Whether or not the tile was used in the previous frame
	 */
	usedLastFrame: boolean;
	/**
	 * This tile is currently visible if:
	 *  1: Tile content is loaded
	 *  2: Tile is within a camera frustum
	 *  3: Tile meets the SSE requirements
	 */
	visible: boolean;
}

/**
 * A 3D Tiles tile with both spec fields (from tileset JSON) and renderer-managed state.
 *
 * See spec for full schema: https://github.com/CesiumGS/3d-tiles/blob/master/specification/schema/tile.schema.json
 */
export interface Tile {

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

	parent: Tile | null;

	children?: Tile[];

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

	// An object that describes the implicit subdivision of this tile.
	implicitTiling?: {
		// A string describing the subdivision scheme used within the tileset.
		subdivisionScheme: 'QUADTREE' | 'OCTREE';
		subtreeLevels: number;
		availableLevels: number;
		// An object describing the location of subtree files.
		subtrees: {
			// A template URI pointing to subtree files
			uri: string;
		}
	};

	/**
	 * Dictionary object with tile specific extension objects.
	 */
	extensions?: Record<string, any>;

	extras?: Record<string, any>;

	refine?: 'REPLACE' | 'ADD';

	transform?: number[];

	// Internal implementation details for tile management
	internal: TileInternalData;

	// Traversal state data updated during each frame's tile traversal
	traversal: TileTraversalData;

}
