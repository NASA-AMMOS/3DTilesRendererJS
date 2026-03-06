import { B3DMBaseResult, B3DMLoaderBase, BatchTable, FeatureTable } from '3d-tiles-renderer/core';
import { LoadingManager, Group } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Extended Three.js Group containing B3DM batch and feature table data.
 *
 * @see {@link B3DMLoader}
 */
export interface B3DMScene extends Group {
	/** Batch table containing per-feature metadata */
	batchTable: BatchTable;
	/** Feature table containing per-feature properties */
	featureTable: FeatureTable;
}

/**
 * Result object returned when loading a B3DM (Batched 3D Model) file.
 *
 * Extends the standard GLTF result with 3D Tiles specific data.
 *
 * @example
 * ```js
 * const loader = new B3DMLoader();
 * const result = await loader.load('model.b3dm');
 * scene.add(result.scene);
 * console.log(result.batchTable);
 * ```
 */
export interface B3DMResult extends GLTF, B3DMBaseResult {
	/** The loaded 3D scene with batch/feature table attached */
	scene: B3DMScene;
}

/**
 * Three.js loader for B3DM (Batched 3D Model) tile format.
 *
 * B3DM is a 3D Tiles format that contains batched glTF models with
 * associated batch and feature tables for per-feature metadata.
 *
 * @example
 * ```js
 * import { B3DMLoader } from '3d-tiles-renderer';
 *
 * const loader = new B3DMLoader();
 * const result = await loader.load('path/to/tile.b3dm');
 * scene.add(result.scene);
 *
 * // Access batch table data
 * const batchTable = result.scene.batchTable;
 * ```
 *
 * @typeParam Result - The result type, defaults to B3DMResult
 * @typeParam ParseResult - The parse result type, defaults to Promise<Result>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel | B3DM Specification}
 * @category Three.js
 */
export class B3DMLoader<Result extends B3DMResult = B3DMResult, ParseResult = Promise<Result>>
	extends B3DMLoaderBase<Result, ParseResult> {

	/**
	 * Creates a new B3DMLoader instance.
	 *
	 * @param manager - Optional Three.js LoadingManager for tracking load progress
	 */
	constructor( manager: LoadingManager );

}
