import type { TilesRendererBase } from '3d-tiles-renderer/core';
type UnloadPriorityCallback = (a: any, b: any) => number;
type RemoveCallback = (item: any) => any;
/**
 * @callback UnloadPriorityCallback
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
/**
 * @callback RemoveCallback
 * @param {any} item
 */
/**
 * Least-recently-used cache for managing tile content lifecycle. Tracks which items
 * are in use each frame and evicts unused items when the cache exceeds its size limits.
 */
declare class LRUCache {
    set unloadPriorityCallback(cb: UnloadPriorityCallback | null);
    /**
     * Comparator used to determine eviction order. Items that sort last are evicted first.
     * Defaults to `null` (eviction order is by last-used time).
     * @type {UnloadPriorityCallback|null}
     */
    get unloadPriorityCallback(): UnloadPriorityCallback | null;
    /**
     * Minimum number of items to keep in the cache after eviction.
     * @type {number}
     */
    minSize: number;
    /**
     * Maximum number of items before eviction is triggered.
     * @type {number}
     */
    maxSize: number;
    /**
     * Minimum total bytes to retain after eviction.
     * @type {number}
     */
    minBytesSize: number;
    /**
     * Maximum total bytes before eviction is triggered.
     * @type {number}
     */
    maxBytesSize: number;
    /**
     * Fraction of excess items/bytes to unload per eviction pass.
     * @type {number}
     */
    unloadPercent: number;
    /**
     * If true, items are automatically marked as unused at the start of each eviction pass.
     * @type {boolean}
     */
    autoMarkUnused: boolean;
    itemSet: Map<any, any>;
    itemList: any[];
    usedSet: Set<any>;
    callbacks: Map<any, any>;
    unloadingHandle: number;
    cachedBytes: number;
    bytesMap: Map<any, any>;
    loadedSet: Set<any>;
    defaultPriorityCallback: (item: any) => any;
    /**
     * Returns whether the cache has reached its maximum item count or byte size.
     * @returns {boolean}
     */
    isFull(): boolean;
    /**
     * Returns the byte size registered for the given item, or 0 if not tracked.
     * @param {any} item
     * @returns {number}
     */
    getMemoryUsage(item: any): number;
    /**
     * Sets the byte size for the given item, updating the total `cachedBytes` count.
     * @param {any} item
     * @param {number} bytes
     */
    setMemoryUsage(item: any, bytes: number): void;
    /**
     * Adds an item to the cache. Returns false if the item already exists or the cache is full.
     * @param {any} item
     * @param {RemoveCallback} removeCb - Called with the item when it is evicted
     * @returns {boolean}
     */
    add(item: any, removeCb: RemoveCallback): boolean;
    /**
     * Returns whether the given item is in the cache.
     * @param {any} item
     * @returns {boolean}
     */
    has(item: any): boolean;
    /**
     * Removes an item from the cache immediately, invoking its removal callback.
     * Returns false if the item was not in the cache.
     * @param {any} item
     * @returns {boolean}
     */
    remove(item: any): boolean;
    /**
     * Marks whether an item has finished loading. Unloaded items may be evicted early
     * when the cache is over its max size limits, even if they are marked as used.
     * @param {any} item
     * @param {boolean} value
     */
    setLoaded(item: any, value: boolean): void;
    /**
     * Marks an item as used in the current frame, preventing it from being evicted.
     * @param {any} item
     */
    markUsed(item: any): void;
    /**
     * Marks an item as unused, making it eligible for eviction.
     * @param {any} item
     */
    markUnused(item: any): void;
    /**
     * Marks all items in the cache as unused.
     */
    markAllUnused(): void;
    /**
     * Returns whether the given item is currently marked as used.
     * @param {any} item
     * @returns {boolean}
     */
    isUsed(item: any): boolean;
    /**
     * Evicts unused items until the cache is within its min size and byte limits.
     * Items are sorted by `unloadPriorityCallback` before eviction.
     */
    unloadUnusedContent(): void;
    /**
     * Schedules `unloadUnusedContent` to run asynchronously via microtask.
     */
    scheduleUnload(): void;
    scheduled: boolean;
}

/**
 * Error thrown when a queued item's promise is rejected because the item was removed
 * before its callback could run.
 *
 * @extends Error
 */
declare class PriorityQueueItemRemovedError extends Error {
    constructor();
}
/**
 * @callback PriorityCallback
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
/**
 * @callback SchedulingCallback
 * @param {Function} func
 */
/**
 * @callback ItemCallback
 * @param {any} item
 * @returns {Promise<any>|any}
 */
/**
 * @callback FilterCallback
 * @param {any} item
 * @returns {boolean}
 */
/**
 * Priority queue for scheduling async work with a concurrency limit. Items are
 * sorted by `priorityCallback` and dispatched up to `maxJobs` at a time.
 */
declare class PriorityQueue {
    get running(): boolean;
    /**
     * Maximum number of jobs that can run concurrently.
     * @type {number}
     */
    maxJobs: number;
    items: any[];
    callbacks: Map<any, any>;
    currJobs: number;
    scheduled: boolean;
    /**
     * If true, job runs are automatically scheduled after `add` and after each job completes.
     * @type {boolean}
     */
    autoUpdate: boolean;
    /**
     * Comparator used to sort queued items. Higher-priority items should sort last
     * (i.e. return positive when `itemA` should run before `itemB`). Defaults to `null`.
     * @type {PriorityCallback|null}
     */
    priorityCallback: PriorityCallback | null;
    /**
     * Callback used to schedule a deferred job run. Defaults to `requestAnimationFrame`.
     * @type {SchedulingCallback}
     */
    schedulingCallback: SchedulingCallback;
    /**
     * Sorts the pending item list using `priorityCallback`, if set.
     */
    sort(): void;
    /**
     * Returns whether the given item is currently queued.
     * @param {any} item
     * @returns {boolean}
     */
    has(item: any): boolean;
    /**
     * Adds an item to the queue and returns a Promise that resolves when the item's
     * callback completes, or rejects if the item is removed before running.
     * @param {any} item
     * @param {ItemCallback} callback - Invoked with `item` when it is dequeued; may return a Promise
     * @returns {Promise<any>}
     */
    add(item: any, callback: ItemCallback): Promise<any>;
    /**
     * Removes an item from the queue, rejecting its promise with `PriorityQueueItemRemovedError`.
     * @param {any} item
     */
    remove(item: any): void;
    /**
     * Removes all queued items for which `filter` returns true.
     * @param {FilterCallback} filter - Called with each item; return true to remove
     */
    removeByFilter(filter: FilterCallback): void;
    /**
     * Immediately attempts to dequeue and run pending jobs up to `maxJobs` concurrency.
     */
    tryRunJobs(): void;
    /**
     * Schedules a deferred call to `tryRunJobs` via `schedulingCallback`.
     */
    scheduleJobRun(): void;
}
type PriorityCallback = (a: any, b: any) => number;
type SchedulingCallback = (func: Function) => any;
type ItemCallback = (item: any) => Promise<any> | any;
type FilterCallback = (item: any) => boolean;

/**
 * Internal renderer state added to each tile during preprocessing.
 * @typedef {Object} TileInternalData
 * @property {boolean} hasContent - Whether the tile has a content URI.
 * @property {boolean} hasRenderableContent - Whether the tile content is a renderable model (not an external tileset).
 * @property {boolean} hasUnrenderableContent - Whether the tile content is an external tileset JSON.
 * @property {number} loadingState - Current loading state constant (UNLOADED, QUEUED, LOADING, PARSING, LOADED, or FAILED).
 * @property {string} basePath - Base URL used to resolve relative content URIs.
 * @property {number} depth - Depth of this tile in the full tile hierarchy.
 * @property {number} depthFromRenderedParent - Depth from the nearest ancestor with renderable content.
 * @property {boolean} isVirtual - Whether this tile was synthetically generated by a plugin.
 * @property {number} virtualChildCount - Number of virtual children appended to this tile by plugins.
 */
/**
 * Per-frame traversal state updated on each tile during `TilesRendererBase.update`.
 * @typedef {Object} TileTraversalData
 * @property {number} distanceFromCamera - Distance from the tile bounds to the nearest active camera.
 * @property {number} error - Screen space error computed for this tile.
 * @property {boolean} inFrustum - Whether the tile was within the camera frustum on the last update.
 * @property {boolean} isLeaf - Whether this tile is a leaf node in the used tile tree.
 * @property {boolean} used - Whether this tile was visited during the last update traversal.
 * @property {boolean} usedLastFrame - Whether this tile was visited in the previous frame.
 * @property {boolean} visible - Whether this tile is currently visible (loaded, in frustum, meets SSE).
 */
/**
 * A 3D Tiles tile with both spec fields (from tileset JSON) and renderer-managed state.
 * @typedef {Object} Tile
 * @property {Object} boundingVolume - Bounding volume. Has either a `box` (12-element array) or `sphere` (4-element array) field.
 * @property {number} geometricError - Error in meters introduced if this tile is not rendered.
 * @property {Tile|null} parent - Parent tile, or null for the root.
 * @property {Tile[]} [children] - Child tiles.
 * @property {Object} [content] - Loadable content URI reference.
 * @property {'REPLACE'|'ADD'} [refine] - Refinement strategy; inherited from the parent if omitted.
 * @property {number[]} [transform] - Optional 4x4 column-major transform matrix.
 * @property {Object} [extensions] - Extension-specific objects.
 * @property {Object} [extras] - Extra application-specific data.
 * @property {TileInternalData} internal - Internal renderer state.
 * @property {TileTraversalData} traversal - Per-frame traversal state.
 */
/**
 * A loaded 3D Tiles tileset JSON object.
 * @typedef {Object} Tileset
 * @property {Object} asset - Metadata about the tileset. Contains `version` (string) and optional `tilesetVersion` (string).
 * @property {number} geometricError - Error in meters for the entire tileset.
 * @property {Tile} root - The root tile.
 * @property {string[]} [extensionsUsed] - Names of extensions used somewhere in the tileset.
 * @property {string[]} [extensionsRequired] - Names of extensions required to load the tileset.
 * @property {Object} [properties] - Metadata about per-feature properties.
 * @property {Object} [extensions] - Extension-specific objects.
 * @property {Object} [extras] - Extra application-specific data.
 */
/**
 * Fired when the renderer determines a new render is required — e.g. after a tile loads.
 * @event TilesRendererBase#needs-update
 */
/**
 * Fired when any tile content (model or external tileset) finishes loading.
 * @event TilesRendererBase#load-content
 */
/**
 * Fired when any tileset JSON finishes loading.
 * @event TilesRendererBase#load-tileset
 * @property {Tileset} tileset - The loaded tileset object.
 * @property {string} url - The URL from which the tileset was loaded.
 */
/**
 * Fired when the root tileset JSON finishes loading.
 * @event TilesRendererBase#load-root-tileset
 * @property {Tileset} tileset - The loaded root tileset object.
 * @property {string} url - The URL from which the tileset was loaded.
 */
/**
 * Fired when tile downloads begin after a period of inactivity.
 * @event TilesRendererBase#tiles-load-start
 */
/**
 * Fired when all pending tile downloads and parses have completed.
 * @event TilesRendererBase#tiles-load-end
 */
/**
 * Fired when a tile content download begins.
 * @event TilesRendererBase#tile-download-start
 * @property {Tile} tile - The tile being downloaded.
 * @property {string} uri - The URI being fetched.
 */
/**
 * Fired when a tile's renderable content (model/scene) is created.
 * The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
 * @event TilesRendererBase#load-model
 * @property {Object} scene - The engine-specific scene object created for this tile.
 * @property {Tile} tile - The tile the scene belongs to.
 * @property {string} url - The URL the content was loaded from.
 */
/**
 * Fired when a tile's renderable content is about to be removed and destroyed.
 * The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
 * @event TilesRendererBase#dispose-model
 * @property {Object} scene - The engine-specific scene object being disposed.
 * @property {Tile} tile - The tile the scene belonged to.
 */
/**
 * Fired when a tile transitions between visible and hidden.
 * The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
 * @event TilesRendererBase#tile-visibility-change
 * @property {Object} scene - The engine-specific scene object.
 * @property {Tile} tile - The tile whose visibility changed.
 * @property {boolean} visible - Whether the tile is now visible.
 */
/**
 * Fired at the start of each `update()` call, before traversal begins.
 * @event TilesRendererBase#update-before
 */
/**
 * Fired at the end of each `update()` call, after traversal completes.
 * @event TilesRendererBase#update-after
 */
/**
 * Fired when a tile or tileset fails to load.
 * @event TilesRendererBase#load-error
 * @property {Tile|null} tile - The tile that failed, or null if a root tileset failed.
 * @property {Error} error - The error that occurred.
 * @property {string|URL} url - The URL that failed to load.
 */
/**
 * Base class for 3D Tiles renderers. Manages tile loading, caching, traversal,
 * and a plugin system for extending rendering behavior. Engine-specific renderers
 * extend this class to add camera projection, scene management, and tile display.
 */
export interface TilesRendererBaseEventMap<TScene = unknown> {
	'needs-update': {};
	'load-content': {};
	'load-tileset': { tileset: Tileset; url: string };
	'load-root-tileset': { tileset: Tileset; url: string };
	'tiles-load-start': {};
	'tiles-load-end': {};
	'tile-download-start': { tile: Tile; uri: string };
	'load-model': { scene: TScene; tile: Tile; url: string };
	'dispose-model': { scene: TScene; tile: Tile };
	'tile-visibility-change': { scene: TScene; tile: Tile; visible: boolean };
	'update-before': {};
	'update-after': {};
	'load-error': { tile: Tile | null; error: Error; url: string | URL };
}

declare class TilesRendererBase<TEventMap extends TilesRendererBaseEventMap = TilesRendererBaseEventMap> {
    /**
     * @param {string} [url] - URL of the root tileset JSON to load.
     */
    constructor(url?: string);
    /**
     * Root tile of the loaded root tileset, or null if not yet loaded.
     * @type {Tile|null}
     */
    get root(): Tile | null;
    get rootTileSet(): Tileset;
    /**
     * Fraction of tiles loaded since the last idle state, from 0 (nothing loaded) to 1 (all loaded).
     * @type {number}
     */
    get loadProgress(): number;
    set errorThreshold(v: number);
    get errorThreshold(): number;
    rootLoadingState: number;
    /**
     * The loaded root tileset object, or null if not yet loaded.
     * @type {Tileset|null}
     * @readonly
     */
    readonly rootTileset: Tileset | null;
    rootURL: string;
    /**
     * Options passed to `fetch` when loading tile and tileset resources.
     * @type {RequestInit}
     */
    fetchOptions: RequestInit;
    plugins: any[];
    queuedTiles: any[];
    cachedSinceLoadComplete: Set<any>;
    isLoading: boolean;
    processedTiles: WeakSet<object>;
    /**
     * Set of all tiles that are currently visible.
     * @type {Set<Tile>}
     * @readonly
     */
    readonly visibleTiles: Set<Tile>;
    /**
     * Set of all tiles that are currently active (displayed as a stand-in while children load).
     * @type {Set<Tile>}
     * @readonly
     */
    readonly activeTiles: Set<Tile>;
    usedSet: Set<any>;
    loadingTiles: Set<any>;
    /**
     * LRU cache managing loaded tile lifecycle and memory eviction.
     * @type {LRUCache}
     */
    lruCache: LRUCache;
    /**
     * Priority queue controlling concurrent tile downloads.
     * @type {PriorityQueue}
     */
    downloadQueue: PriorityQueue;
    /**
     * Priority queue controlling concurrent tile parsing.
     * @type {PriorityQueue}
     */
    parseQueue: PriorityQueue;
    /**
     * Priority queue controlling deferred tile child preprocessing.
     * @type {PriorityQueue}
     */
    processNodeQueue: PriorityQueue;
    /**
     * Loading and rendering statistics updated each frame. Fields:
     * - `inCache` — tiles currently in the LRU cache
     * - `queued` — tiles queued for download
     * - `downloading` — tiles currently downloading
     * - `parsing` — tiles currently being parsed
     * - `loaded` — tiles that have finished loading
     * - `failed` — tiles that failed to load
     * - `inFrustum` — tiles inside the camera frustum after the last update
     * - `used` — tiles visited during the last traversal
     * - `active` — tiles currently set as active
     * - `visible` — tiles currently visible
     * @type {Object}
     */
    stats: any;
    frameCount: number;
    /**
     * Target screen-space error in pixels. Tiles with a higher SSE are subdivided.
     * @type {number}
     */
    errorTarget: number;
    /**
     * If true, tiles are displayed at their current LOD while waiting for higher-detail
     * children to finish loading, rather than hiding them.
     * @type {boolean}
     */
    displayActiveTiles: boolean;
    /**
     * Maximum depth in the tile hierarchy to traverse. Tiles deeper than this are skipped.
     * @type {number}
     */
    maxDepth: number;
    /**
     * If true, uses an optimized traversal strategy that prioritizes distance over error.
     * @type {boolean}
     */
    optimizedLoadStrategy: boolean;
    /**
     * If true, sibling tiles of visible tiles are also loaded to reduce pop-in during camera movement.
     * @type {boolean}
     */
    loadSiblings: boolean;
    /**
     * Maximum number of tile children to preprocess per `update` call. Excess tiles are deferred
     * to `processNodeQueue`.
     * @type {number}
     */
    maxTilesProcessed: number;
    /**
     * Registers a plugin with this renderer. Plugins are inserted in priority order and
     * receive lifecycle callbacks throughout the tile loading and rendering process.
     * A plugin instance may only be registered to one renderer at a time.
     * @param {Object} plugin
     */
    registerPlugin(plugin: any): void;
    /**
     * Removes a registered plugin. Calls `plugin.dispose()` if defined.
     * Accepts either the plugin instance or its string name.
     * Returns true if the plugin was found and removed.
     * @param {Object|string} plugin
     * @returns {boolean}
     */
    unregisterPlugin(plugin: any | string): boolean;
    /**
     * Returns the first registered plugin whose `name` property matches, or null.
     * @param {string} name
     * @returns {Object|null}
     */
    getPluginByName(name: string): any | null;
    invokeOnePlugin(func: any): any;
    invokeAllPlugins(func: any): Promise<any[]>;
    /**
     * Iterates over all tiles in the loaded hierarchy. `beforecb` is called before
     * descending into a tile's children; returning true from it skips the subtree.
     * `aftercb` is called after all children have been visited.
     * @param {TileBeforeCallback|null} [beforecb]
     * @param {TileAfterCallback|null} [aftercb]
     */
    traverse(beforecb?: TileBeforeCallback | null, aftercb?: TileAfterCallback | null, ensureFullyProcessed?: boolean): void;
    /**
     * Collects attribution data from all registered plugins into `target` and returns it.
     * @param {Array<{type: string, value: any}>} [target]
     * @returns {Array<{type: string, value: any}>}
     */
    getAttributions(target?: Array<{
        type: string;
        value: any;
    }>): Array<{
        type: string;
        value: any;
    }>;
    /**
     * Runs the tile traversal and update loop. Should be called once per frame after
     * camera matrices have been updated. Triggers tile loading, visibility updates,
     * and LRU cache eviction.
     */
    update(): void;
    /**
     * Resets any tiles that previously failed to load so they will be retried on the next `update`.
     */
    resetFailedTiles(): void;
    calculateTileViewErrorWithPlugin(tile: any, target: any): void;
    /**
     * Disposes all loaded tiles and unregisters all plugins. The renderer should not
     * be used after calling this.
     */
    dispose(): void;
    calculateBytesUsed(scene: any, tile: any): number;
    /**
     * Dispatches an event to all registered listeners for the given event type.
     * @param {{ type: string }} e
     */
    /**
     * Registers a listener for the given event type.
     * @param {string} name
     * @param {EventCallback} callback
     */
    /**
     * Removes a previously registered event listener.
     * @param {string} name
     * @param {EventCallback} callback
     */
    parseTile(buffer: any, tile: any, extension: any): any;
    prepareForTraversal(): void;
    disposeTile(tile: any): void;
    preprocessNode(tile: any, tilesetDir: any, parentTile?: any): void;
    setTileActive(tile: any, active: any): void;
    setTileVisible(tile: any, visible: any): void;
    calculateTileViewError(tile: any, target: any): void;
    removeUnusedPendingTiles(): void;
    queueTileForDownload(tile: any): void;
    markTileUsed(tile: any): void;
    fetchData(url: any, options: any): Promise<Response>;
    ensureChildrenArePreprocessed(tile: any, forceImmediate?: boolean): void;
    getBytesUsed(tile: any): number;
    recalculateBytesUsed(tile?: any): void;
    preprocessTileset(json: any, url: any, parent?: any): void;
    preprocessTileSet(...args: any[]): void;
    loadRootTileset(): any;
    loadRootTileSet(...args: any[]): any;
    requestTileContents(tile: any): Promise<void>;

	addEventListener<T extends keyof TEventMap>( name: T, callback: ( event: TEventMap[ T ] & { type: T } ) => void ): void;
	addEventListener( name: string, callback: ( event: any ) => void ): void;

	removeEventListener<T extends keyof TEventMap>( name: T, callback: ( event: TEventMap[ T ] & { type: T } ) => void ): void;
	removeEventListener( name: string, callback: ( event: any ) => void ): void;

	hasEventListener<T extends keyof TEventMap>( name: T, callback: ( event: TEventMap[ T ] & { type: T } ) => void ): boolean;
	hasEventListener( name: string, callback: ( event: any ) => void ): boolean;

	dispatchEvent<T extends keyof TEventMap>( event: TEventMap[ T ] & { type: T } ): void;
	dispatchEvent( event: { type: string } ): void;
}
type TileBeforeCallback = (tile: Tile, parent: Tile | null, depth: number) => boolean;
type TileAfterCallback = (tile: Tile, parent: Tile | null, depth: number) => any;
type EventCallback = (event: any) => any;
/**
 * Internal renderer state added to each tile during preprocessing.
 */
type TileInternalData = {
    /**
     * - Whether the tile has a content URI.
     */
    hasContent: boolean;
    /**
     * - Whether the tile content is a renderable model (not an external tileset).
     */
    hasRenderableContent: boolean;
    /**
     * - Whether the tile content is an external tileset JSON.
     */
    hasUnrenderableContent: boolean;
    /**
     * - Current loading state constant (UNLOADED, QUEUED, LOADING, PARSING, LOADED, or FAILED).
     */
    loadingState: number;
    /**
     * - Base URL used to resolve relative content URIs.
     */
    basePath: string;
    /**
     * - Depth of this tile in the full tile hierarchy.
     */
    depth: number;
    /**
     * - Depth from the nearest ancestor with renderable content.
     */
    depthFromRenderedParent: number;
    /**
     * - Whether this tile was synthetically generated by a plugin.
     */
    isVirtual: boolean;
    /**
     * - Number of virtual children appended to this tile by plugins.
     */
    virtualChildCount: number;
};
/**
 * Per-frame traversal state updated on each tile during `TilesRendererBase.update`.
 */
type TileTraversalData = {
    /**
     * - Distance from the tile bounds to the nearest active camera.
     */
    distanceFromCamera: number;
    /**
     * - Screen space error computed for this tile.
     */
    error: number;
    /**
     * - Whether the tile was within the camera frustum on the last update.
     */
    inFrustum: boolean;
    /**
     * - Whether this tile is a leaf node in the used tile tree.
     */
    isLeaf: boolean;
    /**
     * - Whether this tile was visited during the last update traversal.
     */
    used: boolean;
    /**
     * - Whether this tile was visited in the previous frame.
     */
    usedLastFrame: boolean;
    /**
     * - Whether this tile is currently visible (loaded, in frustum, meets SSE).
     */
    visible: boolean;
};
/**
 * A 3D Tiles tile with both spec fields (from tileset JSON) and renderer-managed state.
 */
type Tile = {
    /**
     * - Bounding volume. Has either a `box` (12-element array) or `sphere` (4-element array) field.
     */
    boundingVolume: any;
    /**
     * - Error in meters introduced if this tile is not rendered.
     */
    geometricError: number;
    /**
     * - Parent tile, or null for the root.
     */
    parent: Tile | null;
    /**
     * - Child tiles.
     */
    children?: Tile[];
    /**
     * - Loadable content URI reference.
     */
    content?: any;
    /**
     * - Refinement strategy; inherited from the parent if omitted.
     */
    refine?: "REPLACE" | "ADD";
    /**
     * - Optional 4x4 column-major transform matrix.
     */
    transform?: number[];
    /**
     * - Extension-specific objects.
     */
    extensions?: any;
    /**
     * - Extra application-specific data.
     */
    extras?: any;
    /**
     * - Internal renderer state.
     */
    internal: TileInternalData;
    /**
     * - Per-frame traversal state.
     */
    traversal: TileTraversalData;
};
/**
 * A loaded 3D Tiles tileset JSON object.
 */
type Tileset = {
    /**
     * - Metadata about the tileset. Contains `version` (string) and optional `tilesetVersion` (string).
     */
    asset: any;
    /**
     * - Error in meters for the entire tileset.
     */
    geometricError: number;
    /**
     * - The root tile.
     */
    root: Tile;
    /**
     * - Names of extensions used somewhere in the tileset.
     */
    extensionsUsed?: string[];
    /**
     * - Names of extensions required to load the tileset.
     */
    extensionsRequired?: string[];
    /**
     * - Metadata about per-feature properties.
     */
    properties?: any;
    /**
     * - Extension-specific objects.
     */
    extensions?: any;
    /**
     * - Extra application-specific data.
     */
    extras?: any;
};

/**
 * Base class for all 3D Tiles content loaders. Handles fetching and parsing tile content.
 */
declare class LoaderBase {
    /**
     * Options passed to `fetch` when loading tile content.
     * @type {Object}
     */
    fetchOptions: any;
    /**
     * Base URL used to resolve relative external URLs.
     * @type {string}
     */
    workingPath: string;
    /**
     * @deprecated Use `loadAsync` instead.
     * @param {string} url
     * @returns {Promise<any>}
     */
    load(...args: any[]): Promise<any>;
    /**
     * Fetches and parses content from the given URL.
     * @param {string} url
     * @returns {Promise<any>}
     */
    loadAsync(url: string): Promise<any>;
    /**
     * Resolves a relative URL against `workingPath`.
     * @param {string} url
     * @returns {string}
     */
    resolveExternalURL(url: string): string;
    /**
     * Parses a raw buffer into a tile result object. Must be implemented by subclasses.
     * @param {ArrayBuffer} buffer
     * @returns {any}
     */
    parse(buffer: ArrayBuffer): any;
}

/**
 * Parses a 3D Tiles feature table from a binary buffer, providing access to
 * per-feature properties stored as JSON scalars or typed binary arrays.
 */
declare class FeatureTable {
    /**
     * @param {ArrayBuffer} buffer
     * @param {number} start - Byte offset of the feature table within the buffer
     * @param {number} headerLength - Byte length of the JSON header
     * @param {number} binLength - Byte length of the binary body
     */
    constructor(buffer: ArrayBuffer, start: number, headerLength: number, binLength: number);
    /**
     * The underlying buffer containing the feature table data.
     * @type {ArrayBuffer}
     */
    buffer: ArrayBuffer;
    /**
     * Byte offset of the binary body within the buffer.
     * @type {number}
     */
    binOffset: number;
    /**
     * Byte length of the binary body.
     * @type {number}
     */
    binLength: number;
    /**
     * Parsed JSON header object.
     * @type {Object}
     */
    header: any;
    /**
     * Returns all property key names defined in the feature table header, excluding `extensions`.
     * @returns {Array<string>}
     */
    getKeys(): Array<string>;
    /**
     * Returns the value for the given property key. For binary properties, reads typed array data
     * from the binary body using the provided count, component type, and vector type.
     * @param {string} key
     * @param {number} count - Number of elements to read for binary properties
     * @param {string | null} [defaultComponentType] - Fallback component type (e.g. `'FLOAT'`, `'UNSIGNED_SHORT'`)
     * @param {string | null} [defaultType] - Fallback vector type (e.g. `'SCALAR'`, `'VEC3'`)
     * @returns {number | string | ArrayBufferView | null}
     */
    getData(key: string, count: number, defaultComponentType?: string | null, defaultType?: string | null): number | string | ArrayBufferView | null;
    /**
     * Returns a slice of the binary body at the given offset and length.
     * @param {number} byteOffset
     * @param {number} byteLength
     * @returns {ArrayBuffer}
     */
    getBuffer(byteOffset: number, byteLength: number): ArrayBuffer;
}

/**
 * Extends FeatureTable to provide indexed access to per-feature batch properties,
 * as found in B3DM and PNTS tiles.
 *
 * @extends FeatureTable
 */
declare class BatchTable extends FeatureTable {
    /**
     * @param {ArrayBuffer} buffer
     * @param {number} count - Number of features in the batch
     * @param {number} start - Byte offset of the batch table within the buffer
     * @param {number} headerLength - Byte length of the JSON header
     * @param {number} binLength - Byte length of the binary body
     */
    constructor(buffer: ArrayBuffer, count: number, start: number, headerLength: number, binLength: number);
    get batchSize(): number;
    /**
     * Total number of features in the batch.
     * @type {number}
     */
    count: number;
    /**
     * Parsed extension objects keyed by extension name.
     * @type {Object}
     */
    extensions: any;
    /**
     * @deprecated Use `getDataFromId` or `getPropertyArray` instead.
     * @param {string} key
     * @param {string | null} [componentType]
     * @param {string | null} [type]
     * @returns {number | string | ArrayBufferView | null}
     */
    getData(key: string, componentType?: string | null, type?: string | null): number | string | ArrayBufferView | null;
    /**
     * Returns all batch table properties for the given feature id as an object.
     * @param {number} id - Feature index (0 to count - 1)
     * @param {Object} [target={}] - Optional object to write properties into
     * @returns {Object}
     */
    getDataFromId(id: number, target?: any): any;
    /**
     * Returns the full typed array of values for the given property key across all features.
     * @param {string} key
     * @returns {number | string | ArrayBufferView}
     */
    getPropertyArray(key: string): number | string | ArrayBufferView;
}

/**
 * Base loader for the B3DM (Batched 3D Model) tile format. Parses the B3DM binary
 * structure and extracts the embedded GLB bytes along with batch and feature tables.
 * Extend this class to integrate B3DM loading into a specific rendering engine.
 *
 * @extends LoaderBase
 */
declare class B3DMLoaderBase extends LoaderBase {
    /**
     * Parses a B3DM buffer and returns the raw tile data.
     * @param {ArrayBuffer} buffer
     * @returns {{ version: string, featureTable: FeatureTable, batchTable: BatchTable, glbBytes: Uint8Array }}
     */
    parse(buffer: ArrayBuffer): {
        version: string;
        featureTable: FeatureTable;
        batchTable: BatchTable;
        glbBytes: Uint8Array;
    };
}

/**
 * Base loader for the I3DM (Instanced 3D Model) tile format. Parses the I3DM binary
 * structure and extracts the embedded GLB bytes (or fetches an external GLTF) along
 * with batch and feature tables. Extend this class to integrate I3DM loading into a
 * specific rendering engine.
 *
 * @extends LoaderBase
 */
declare class I3DMLoaderBase extends LoaderBase {
    /**
     * Parses an I3DM buffer and returns the raw tile data.
     * @param {ArrayBuffer} buffer
     * @returns {Promise<{ version: string, featureTable: FeatureTable, batchTable: BatchTable, glbBytes: Uint8Array, gltfWorkingPath: string }>}
     */
    parse(buffer: ArrayBuffer): Promise<{
        version: string;
        featureTable: FeatureTable;
        batchTable: BatchTable;
        glbBytes: Uint8Array;
        gltfWorkingPath: string;
    }>;
}

/**
 * Base loader for the PNTS (Point Cloud) tile format. Parses the PNTS binary
 * structure and extracts the feature and batch tables containing point positions,
 * colors, and normals. Extend this class to integrate PNTS loading into a specific
 * rendering engine.
 *
 * @extends LoaderBase
 */
declare class PNTSLoaderBase extends LoaderBase {
    /**
     * Parses a PNTS buffer and returns the raw tile data.
     * @param {ArrayBuffer} buffer
     * @returns {Promise<{ version: string, featureTable: FeatureTable, batchTable: BatchTable }>}
     */
    parse(buffer: ArrayBuffer): Promise<{
        version: string;
        featureTable: FeatureTable;
        batchTable: BatchTable;
    }>;
}

/**
 * Base loader for the CMPT (Composite) tile format. Parses the CMPT binary structure
 * and returns the individual inner tile buffers with their format types. Extend this
 * class to integrate CMPT loading into a specific rendering engine.
 *
 * @extends LoaderBase
 */
declare class CMPTLoaderBase extends LoaderBase {
    /**
     * Parses a CMPT buffer and returns an object containing each inner tile's type and raw buffer.
     * @param {ArrayBuffer} buffer
     * @returns {{ version: string, tiles: Array<{ type: string, buffer: Uint8Array, version: number }> }}
     */
    parse(buffer: ArrayBuffer): {
        version: string;
        tiles: Array<{
            type: string;
            buffer: Uint8Array;
            version: number;
        }>;
    };
}

/**
 * Tile content failed to load. Sorted first for eviction by the LRU cache.
 * @type {number}
 */
declare const FAILED: number;
/**
 * Tile content has not been requested.
 * @type {number}
 */
declare const UNLOADED: number;
/**
 * Tile content is queued for download.
 * @type {number}
 */
declare const QUEUED: number;
/**
 * Tile content is currently downloading.
 * @type {number}
 */
declare const LOADING: number;
/**
 * Tile content has been downloaded and is being parsed.
 * @type {number}
 */
declare const PARSING: number;
/**
 * Tile content has been parsed and is ready to display.
 * @type {number}
 */
declare const LOADED: number;
/**
 * WGS84 ellipsoid semi-major axis radius in meters.
 * @type {number}
 */
declare const WGS84_RADIUS: number;
/**
 * WGS84 ellipsoid flattening factor.
 * @type {number}
 */
declare const WGS84_FLATTENING: number;
/**
 * WGS84 ellipsoid height offset (difference between equatorial and polar radii) in meters.
 * @type {number}
 */
declare const WGS84_HEIGHT: number;

declare function traverseSet(tile: any, beforeCb?: any, afterCb?: any): void;
declare function traverseAncestors(tile: any, callback?: any): void;

declare const TraversalUtils_d_traverseAncestors: typeof traverseAncestors;
declare const TraversalUtils_d_traverseSet: typeof traverseSet;
declare namespace TraversalUtils_d {
  export {
    TraversalUtils_d_traverseAncestors as traverseAncestors,
    TraversalUtils_d_traverseSet as traverseSet,
  };
}

declare function readMagicBytes(bufferOrDataView: any): string;
declare function arrayToString(array: any): string;
declare function getWorkingPath(url: any): string;

declare const LoaderUtils_d_arrayToString: typeof arrayToString;
declare const LoaderUtils_d_getWorkingPath: typeof getWorkingPath;
declare const LoaderUtils_d_readMagicBytes: typeof readMagicBytes;
declare namespace LoaderUtils_d {
  export {
    LoaderUtils_d_arrayToString as arrayToString,
    LoaderUtils_d_getWorkingPath as getWorkingPath,
    LoaderUtils_d_readMagicBytes as readMagicBytes,
  };
}

export { B3DMLoaderBase, BatchTable, CMPTLoaderBase, FAILED, FeatureTable, I3DMLoaderBase, LOADED, LOADING, LRUCache, LoaderBase, LoaderUtils_d as LoaderUtils, PARSING, PNTSLoaderBase, PriorityQueue, PriorityQueueItemRemovedError, QUEUED, TilesRendererBase, TraversalUtils_d as TraversalUtils, UNLOADED, WGS84_FLATTENING, WGS84_HEIGHT, WGS84_RADIUS };
export type { FilterCallback, ItemCallback, PriorityCallback, SchedulingCallback };
