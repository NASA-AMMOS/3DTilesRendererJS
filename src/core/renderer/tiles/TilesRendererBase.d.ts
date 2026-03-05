import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';

/**
 * Base class for rendering 3D Tiles tilesets.
 *
 * This is the engine-agnostic base class that handles tile loading, caching,
 * and traversal logic. It provides the core functionality for loading and managing
 * 3D Tiles data without any rendering engine dependencies.
 *
 * For Three.js integration, use `TilesRenderer` from `3d-tiles-renderer` instead.
 *
 * @example Basic usage
 * ```js
 * import { TilesRendererBase } from '3d-tiles-renderer/core';
 *
 * const renderer = new TilesRendererBase('https://example.com/tileset.json');
 *
 * function animate() {
 *   requestAnimationFrame(animate);
 *   renderer.update();
 * }
 * animate();
 * ```
 *
 * @example With plugins
 * ```js
 * import { TilesRendererBase } from '3d-tiles-renderer/core';
 * import { CesiumIonAuthPlugin } from '3d-tiles-renderer/plugins';
 *
 * const renderer = new TilesRendererBase();
 * renderer.registerPlugin(new CesiumIonAuthPlugin({ apiToken: 'your-token', assetId: '12345' }));
 * ```
 *
 * @see {@link https://github.com/NASA-AMMOS/3DTilesRendererJS | GitHub Repository}
 * @category Core
 */
export class TilesRendererBase {

	/**
	 * The root tileset JSON object once loaded.
	 * Returns `null` if the tileset hasn't been loaded yet.
	 * @readonly
	 */
	readonly rootTileset: object | null;

	/**
	 * @deprecated Use {@link rootTileset} instead. Will be removed in v1.0.
	 * @readonly
	 */
	readonly rootTileSet: object | null;

	/**
	 * The root tile of the tileset hierarchy.
	 * Returns `null` if the tileset hasn't been loaded yet.
	 * @readonly
	 */
	readonly root: object | null;

	/**
	 * Target screen space error in pixels.
	 *
	 * Lower values will load higher detail tiles but use more memory and bandwidth.
	 * Higher values will load lower detail tiles, improving performance.
	 *
	 * @defaultValue 6
	 */
	errorTarget: number;

	/**
	 * Error threshold multiplier for hybrid LOD selection.
	 *
	 * Tiles are unloaded when their screen space error exceeds `errorTarget * errorThreshold`.
	 * Set to `Infinity` to disable hybrid selection and only use `errorTarget`.
	 *
	 * @defaultValue Infinity
	 */
	errorThreshold: number;

	/**
	 * Whether to render tiles that are actively being loaded.
	 *
	 * When `true`, parent tiles will be displayed while higher detail children are loading,
	 * which can help reduce visual "popping" but may show lower quality geometry temporarily.
	 *
	 * @defaultValue false
	 */
	displayActiveTiles: boolean;

	/**
	 * Maximum depth of tiles to load in the tileset hierarchy.
	 *
	 * Set to `Infinity` to load all available levels of detail.
	 * Useful for debugging or limiting memory usage.
	 *
	 * @defaultValue Infinity
	 */
	maxDepth: number;

	/**
	 * Whether to load sibling tiles when loading a tile.
	 *
	 * When `true`, all sibling tiles at the same level will be loaded together,
	 * which can help reduce visual inconsistencies at tile boundaries.
	 *
	 * @defaultValue false
	 */
	loadSiblings: boolean;

	/**
	 * Whether to use optimized tile loading strategy.
	 *
	 * When `true`, tiles are loaded in an order optimized for the current view,
	 * prioritizing visible tiles over those that may become visible.
	 *
	 * @defaultValue true
	 */
	optimizedLoadStrategy: boolean;

	/**
	 * Maximum number of tiles to process (parse) per frame.
	 *
	 * Limiting this value can help maintain smooth frame rates during heavy loading.
	 *
	 * @defaultValue 10
	 */
	maxTilesProcessed: number;

	/**
	 * Current loading progress as a value between 0 and 1.
	 *
	 * - `0`: No tiles loaded
	 * - `1`: All visible tiles loaded
	 *
	 * Useful for displaying loading indicators.
	 *
	 * @readonly
	 */
	loadProgress: number;

	/**
	 * Options passed to `fetch()` when downloading tiles.
	 *
	 * Use this to configure headers, credentials, caching behavior, etc.
	 *
	 * @example
	 * ```js
	 * renderer.fetchOptions = {
	 *   headers: { 'Authorization': 'Bearer token' },
	 *   credentials: 'include'
	 * };
	 * ```
	 */
	fetchOptions: RequestInit;

	/**
	 * LRU cache for managing loaded tile content.
	 *
	 * Controls memory usage by automatically unloading least recently used tiles
	 * when the cache limit is reached.
	 *
	 * @see {@link LRUCache}
	 */
	lruCache: LRUCache;

	/**
	 * Priority queue for tile parsing operations.
	 *
	 * Controls the order and concurrency of tile content parsing.
	 */
	parseQueue: PriorityQueue;

	/**
	 * Priority queue for tile download operations.
	 *
	 * Controls the order and concurrency of tile downloads.
	 */
	downloadQueue: PriorityQueue;

	/**
	 * Priority queue for processing tile nodes in the hierarchy.
	 */
	processNodeQueue: PriorityQueue;

	/**
	 * Creates a new TilesRendererBase instance.
	 *
	 * @param url - Optional URL to the root tileset.json file.
	 *              Can also be set later via plugins like CesiumIonAuthPlugin.
	 *
	 * @example
	 * ```js
	 * // With URL
	 * const renderer = new TilesRendererBase('https://example.com/tileset.json');
	 *
	 * // Without URL (set via plugin)
	 * const renderer = new TilesRendererBase();
	 * renderer.registerPlugin(new CesiumIonAuthPlugin({ apiToken: 'token', assetId: '123' }));
	 * ```
	 */
	constructor(url?: string);

	/**
	 * Updates the tile loading and rendering state.
	 *
	 * This method must be called every frame in your render loop to:
	 * - Process tile visibility and LOD selection
	 * - Manage tile loading and unloading
	 * - Update internal state
	 *
	 * @example
	 * ```js
	 * function animate() {
	 *   requestAnimationFrame(animate);
	 *   renderer.update();
	 *   // ... render scene
	 * }
	 * animate();
	 * ```
	 */
	update(): void;

	/**
	 * Registers a plugin to extend renderer functionality.
	 *
	 * Plugins can modify loading behavior, add authentication, apply visual effects, etc.
	 *
	 * @param plugin - The plugin instance to register
	 *
	 * @example
	 * ```js
	 * import { CesiumIonAuthPlugin, DebugTilesPlugin } from '3d-tiles-renderer/plugins';
	 *
	 * renderer.registerPlugin(new CesiumIonAuthPlugin({ apiToken: 'token', assetId: '123' }));
	 * renderer.registerPlugin(new DebugTilesPlugin());
	 * ```
	 *
	 * @see {@link unregisterPlugin}
	 * @see {@link getPluginByName}
	 */
	registerPlugin(plugin: object): void;

	/**
	 * Unregisters a previously registered plugin.
	 *
	 * @param plugin - The plugin instance or plugin name to unregister
	 * @returns `true` if the plugin was found and removed, `false` otherwise
	 *
	 * @example
	 * ```js
	 * // By instance
	 * renderer.unregisterPlugin(myPlugin);
	 *
	 * // By name
	 * renderer.unregisterPlugin('DebugTilesPlugin');
	 * ```
	 */
	unregisterPlugin(plugin: object | string): boolean;

	/**
	 * Retrieves a registered plugin by name.
	 *
	 * @param plugin - The plugin name or instance to find
	 * @returns The plugin instance, or `null` if not found
	 *
	 * @example
	 * ```js
	 * const debugPlugin = renderer.getPluginByName('DebugTilesPlugin');
	 * if (debugPlugin) {
	 *   debugPlugin.displayBoxBounds = true;
	 * }
	 * ```
	 */
	getPluginByName(plugin: object | string): object;

	/**
	 * Traverses all tiles in the tileset hierarchy.
	 *
	 * Calls the provided callbacks for each tile during traversal.
	 * Return `false` from a callback to skip traversing that tile's children.
	 *
	 * @param beforeCb - Callback called before visiting a tile's children.
	 *                   Return `false` to skip children.
	 * @param afterCb - Callback called after visiting a tile's children.
	 *                  Return `false` to stop traversal.
	 *
	 * @example
	 * ```js
	 * renderer.traverse(
	 *   (tile, parent, depth) => {
	 *     console.log(`Visiting tile at depth ${depth}`);
	 *     return depth < 3; // Only traverse first 3 levels
	 *   },
	 *   null
	 * );
	 * ```
	 */
	traverse(
		beforeCb: ((tile: object, parent: object, depth: number) => boolean) | null,
		afterCb: ((tile: object, parent: object, depth: number) => boolean) | null
	): void;

	/**
	 * Gets attribution information from the tileset.
	 *
	 * Collects attribution data that should be displayed according to the tileset's license.
	 *
	 * @param target - Optional array to populate with attributions. If not provided, a new array is created.
	 * @returns Array of attribution objects with `type` and `value` properties
	 *
	 * @example
	 * ```js
	 * const attributions = renderer.getAttributions();
	 * attributions.forEach(attr => {
	 *   console.log(`${attr.type}: ${attr.value}`);
	 * });
	 * ```
	 */
	getAttributions(target?: Array<{ type: string, value: any }>): Array<{ type: string, value: any }>;

	/**
	 * Disposes of all resources held by the renderer.
	 *
	 * Call this when you're done using the renderer to free memory and cancel pending operations.
	 * After calling dispose, the renderer should not be used again.
	 *
	 * @example
	 * ```js
	 * // Clean up when done
	 * renderer.dispose();
	 * renderer = null;
	 * ```
	 */
	dispose(): void;

	/**
	 * Resets the failed state of all tiles that failed to load.
	 *
	 * After calling this, the renderer will attempt to reload tiles that
	 * previously failed (e.g., due to network errors).
	 *
	 * @example
	 * ```js
	 * // Retry loading after network recovery
	 * window.addEventListener('online', () => {
	 *   renderer.resetFailedTiles();
	 * });
	 * ```
	 */
	resetFailedTiles(): void;

}
