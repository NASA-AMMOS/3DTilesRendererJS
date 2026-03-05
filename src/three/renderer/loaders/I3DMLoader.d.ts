import { I3DMBaseResult, I3DMLoaderBase, BatchTable, FeatureTable } from '3d-tiles-renderer/core';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, LoadingManager } from 'three';

/**
 * Extended Three.js Group containing I3DM batch and feature table data.
 *
 * @see {@link I3DMLoader}
 */
export interface I3DMScene extends Group {
	/** Batch table containing per-instance metadata */
	batchTable: BatchTable;
	/** Feature table containing per-instance properties */
	featureTable: FeatureTable;
}

/**
 * Result object returned when loading an I3DM (Instanced 3D Model) file.
 *
 * Extends the standard GLTF result with 3D Tiles specific data.
 *
 * @example
 * ```js
 * const loader = new I3DMLoader();
 * const result = await loader.load('instanced.i3dm');
 * scene.add(result.scene);
 * ```
 */
export interface I3DMResult extends GLTF, I3DMBaseResult {
	/** The loaded instanced models with batch/feature table attached */
	scene: I3DMScene;
}

/**
 * Three.js loader for I3DM (Instanced 3D Model) tile format.
 *
 * I3DM is a 3D Tiles format for instanced glTF models where the same
 * model is repeated at different positions, orientations, and scales.
 * Useful for trees, streetlights, and other repeated objects.
 *
 * @example
 * ```js
 * import { I3DMLoader } from '3d-tiles-renderer';
 *
 * const loader = new I3DMLoader();
 * const result = await loader.load('path/to/tile.i3dm');
 * scene.add(result.scene);
 *
 * // Access instance count from feature table
 * const instanceCount = result.scene.featureTable.getData('INSTANCES_LENGTH');
 * ```
 *
 * @typeParam Result - The result type, defaults to I3DMResult
 * @typeParam ParseResult - The parse result type, defaults to Promise<Result>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Instanced3DModel | I3DM Specification}
 * @category Three.js
 */
export class I3DMLoader<Result extends I3DMResult = I3DMResult, ParseResult = Promise<Result>>
	extends I3DMLoaderBase<Result, ParseResult> {

	/**
	 * Creates a new I3DMLoader instance.
	 *
	 * @param manager - Optional Three.js LoadingManager for tracking load progress
	 */
	constructor(manager: LoadingManager);

}
