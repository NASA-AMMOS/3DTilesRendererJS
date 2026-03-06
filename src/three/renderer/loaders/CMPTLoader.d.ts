import { B3DMBaseResult, I3DMBaseResult, PNTSBaseResult, CMPTLoaderBase } from '3d-tiles-renderer/core';
import { Group, LoadingManager } from 'three';

/**
 * Result object returned when loading a CMPT (Composite) file.
 *
 * Contains an array of inner tiles and a combined scene.
 *
 * @example
 * ```js
 * const loader = new CMPTLoader();
 * const result = await loader.load('composite.cmpt');
 * scene.add(result.scene);
 * console.log(`Loaded ${result.tiles.length} inner tiles`);
 * ```
 */
export interface CMPTResult {
	/** Array of inner tile results (B3DM, I3DM, or PNTS) */
	tiles: Array<B3DMBaseResult | I3DMBaseResult | PNTSBaseResult>;
	/** Combined scene containing all inner tile geometry */
	scene: Group;
}

/**
 * Three.js loader for CMPT (Composite) tile format.
 *
 * CMPT is a 3D Tiles format that combines multiple inner tiles
 * (B3DM, I3DM, PNTS, or nested CMPT) into a single file.
 *
 * @example
 * ```js
 * import { CMPTLoader } from '3d-tiles-renderer';
 *
 * const loader = new CMPTLoader();
 * const result = await loader.load('path/to/tile.cmpt');
 * scene.add(result.scene);
 *
 * // Access individual inner tiles
 * result.tiles.forEach((tile, index) => {
 *   console.log(`Tile ${index}:`, tile);
 * });
 * ```
 *
 * @typeParam Result - The result type, defaults to CMPTResult
 * @typeParam ParseResult - The parse result type, defaults to Promise<Result>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite | CMPT Specification}
 * @category Three.js
 */
export class CMPTLoader<Result extends CMPTResult = CMPTResult, ParseResult = Promise<Result>>
	extends CMPTLoaderBase<Result, ParseResult> {

	/**
	 * Creates a new CMPTLoader instance.
	 *
	 * @param manager - Optional Three.js LoadingManager for tracking load progress
	 */
	constructor( manager: LoadingManager );

}
