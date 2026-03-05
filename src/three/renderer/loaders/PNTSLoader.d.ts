import { PNTSBaseResult, PNTSLoaderBase, BatchTable, FeatureTable } from '3d-tiles-renderer/core';
import { Points, LoadingManager } from 'three';

/**
 * Extended Three.js Points object containing PNTS batch and feature table data.
 *
 * @see {@link PNTSLoader}
 */
export interface PNTSScene extends Points {
	/** Batch table containing per-point metadata */
	batchTable: BatchTable;
	/** Feature table containing per-point properties */
	featureTable: FeatureTable;
}

/**
 * Result object returned when loading a PNTS (Point Cloud) file.
 *
 * @example
 * ```js
 * const loader = new PNTSLoader();
 * const result = await loader.load('pointcloud.pnts');
 * scene.add(result.scene);
 * ```
 */
export interface PNTSResult extends PNTSBaseResult {
	/** The loaded point cloud with batch/feature table attached */
	scene: PNTSScene;
}

/**
 * Three.js loader for PNTS (Point Cloud) tile format.
 *
 * PNTS is a 3D Tiles format for point cloud data with optional
 * per-point colors, normals, and metadata in batch/feature tables.
 *
 * @example
 * ```js
 * import { PNTSLoader } from '3d-tiles-renderer';
 *
 * const loader = new PNTSLoader();
 * const result = await loader.load('path/to/tile.pnts');
 * scene.add(result.scene);
 *
 * // Access point count
 * console.log(result.scene.geometry.attributes.position.count);
 * ```
 *
 * @typeParam Result - The result type, defaults to PNTSResult
 * @typeParam ParseResult - The parse result type, defaults to Promise<Result>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud | PNTS Specification}
 * @category Three.js
 */
export class PNTSLoader<Result extends PNTSResult = PNTSResult, ParseResult = Promise<Result>>
	extends PNTSLoaderBase<Result, ParseResult> {

	/**
	 * Creates a new PNTSLoader instance.
	 *
	 * @param manager - Optional Three.js LoadingManager for tracking load progress
	 */
	constructor(manager: LoadingManager);

}
