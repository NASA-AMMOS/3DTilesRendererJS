<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/core

## Constants

### FAILED

```js
FAILED: number
```

Tile content failed to load. Sorted first for eviction by the LRU cache.

### UNLOADED

```js
UNLOADED: number
```

Tile content has not been requested.

### QUEUED

```js
QUEUED: number
```

Tile content is queued for download.

### LOADING

```js
LOADING: number
```

Tile content is currently downloading.

### PARSING

```js
PARSING: number
```

Tile content has been downloaded and is being parsed.

### LOADED

```js
LOADED: number
```

Tile content has been parsed and is ready to display.

### WGS84_RADIUS

```js
WGS84_RADIUS: number
```

WGS84 ellipsoid semi-major axis radius in meters.
See the [WGS84 specification](https://en.wikipedia.org/wiki/World_Geodetic_System).

### WGS84_FLATTENING

```js
WGS84_FLATTENING: number
```

WGS84 ellipsoid flattening factor.
See [ellipsoid flattening](https://en.wikipedia.org/wiki/Flattening).

### WGS84_HEIGHT

```js
WGS84_HEIGHT: number
```

WGS84 ellipsoid height offset (difference between equatorial and polar radii) in meters.

## LoaderBase

Base class for all 3D Tiles content loaders. Handles fetching and parsing tile content.


### .fetchOptions

```js
fetchOptions: Object
```

Options passed to `fetch` when loading tile content.


### .workingPath

```js
workingPath: string
```

Base URL used to resolve relative external URLs.


### .loadAsync

```js
loadAsync( url: string ): Promise<any>
```

Fetches and parses content from the given URL.


### .resolveExternalURL

```js
resolveExternalURL( url: string ): string
```

Resolves a relative URL against `workingPath`.


### .parse

```js
parse( buffer: ArrayBuffer ): any
```

Parses a raw buffer into a tile result object. Must be implemented by subclasses.


## B3DMLoaderBase

_extends [`LoaderBase`](#loaderbase)_

Base loader for the B3DM (Batched 3D Model) tile format. Parses the B3DM binary
structure and extracts the embedded GLB bytes along with batch and feature tables.
Extend this class to integrate B3DM loading into a specific rendering engine.


### .parse

```js
parse( buffer: ArrayBuffer ): Object
```

Parses a B3DM buffer and returns the raw tile data.


## FeatureTable

Parses a 3D Tiles feature table from a binary buffer, providing access to
per-feature properties stored as JSON scalars or typed binary arrays.


### .buffer

```js
buffer: ArrayBuffer
```

The underlying buffer containing the feature table data.


### .binOffset

```js
binOffset: number
```

Byte offset of the binary body within the buffer.


### .binLength

```js
binLength: number
```

Byte length of the binary body.


### .header

```js
header: Object
```

Parsed JSON header object.


### .constructor

```js
constructor( buffer: ArrayBuffer, start: number, headerLength: number, binLength: number )
```

### .getKeys

```js
getKeys(): Array<string>
```

Returns all property key names defined in the feature table header, excluding `extensions`.


### .getData

```js
getData(
	key: string,
	count: number,
	defaultComponentType = null: string | null,
	defaultType = null: string | null
): number | string | ArrayBufferView | null
```

Returns the value for the given property key. For binary properties, reads typed array data
from the binary body using the provided count, component type, and vector type.


### .getBuffer

```js
getBuffer( byteOffset: number, byteLength: number ): ArrayBuffer
```

Returns a slice of the binary body at the given offset and length.


## BatchTable

_extends [`FeatureTable`](#featuretable)_

Extends FeatureTable to provide indexed access to per-feature batch properties,
as found in B3DM and PNTS tiles.


### .count

```js
count: number
```

Total number of features in the batch.


### .extensions

```js
extensions: Object
```

Parsed extension objects keyed by extension name.


### .constructor

```js
constructor( buffer: ArrayBuffer, count: number, start: number, headerLength: number, binLength: number )
```

### .getDataFromId

```js
getDataFromId( id: number, target = {}: Object ): Object
```

Returns an object with all properties of the batch table and its extensions for the
given feature id. A `target` object can be specified to store the result. Throws if
`id` is out of bounds.


### .getPropertyArray

```js
getPropertyArray( key: string ): Array | TypedArray | null
```

Returns the array of values for the given property key across all features. Returns
`null` if the key is not in the table.


## CMPTLoaderBase

_extends [`LoaderBase`](#loaderbase)_

Base loader for the CMPT (Composite) tile format. Parses the CMPT binary structure
and returns the individual inner tile buffers with their format types. Extend this
class to integrate CMPT loading into a specific rendering engine.


### .parse

```js
parse( buffer: ArrayBuffer ): Object
```

Parses a CMPT buffer and returns an object containing each inner tile's type and raw buffer.


## I3DMLoaderBase

_extends [`LoaderBase`](#loaderbase)_

Base loader for the I3DM (Instanced 3D Model) tile format. Parses the I3DM binary
structure and extracts the embedded GLB bytes (or fetches an external GLTF) along
with batch and feature tables. Extend this class to integrate I3DM loading into a
specific rendering engine.


### .parse

```js
parse(
	buffer: ArrayBuffer
): Promise<{version: string, featureTable: FeatureTable, batchTable: BatchTable, glbBytes: Uint8Array, gltfWorkingPath: string}>
```

Parses an I3DM buffer and returns the raw tile data.


## LRUCache

Least-recently-used cache for managing tile content lifecycle. Tracks which items
are in use each frame and evicts unused items when the cache exceeds its size limits.


### .unloadPriorityCallback

```js
unloadPriorityCallback: ( a: any, b: any ) => number | null
```

Comparator used to determine eviction order. Items that sort last are evicted first.
Defaults to `null` (eviction order is by last-used time).


### .minSize

```js
minSize: number
```

Minimum number of items to keep in the cache after eviction.


### .maxSize

```js
maxSize: number
```

Maximum number of items before eviction is triggered.


### .minBytesSize

```js
minBytesSize: number
```

Minimum total bytes to retain after eviction.

> [!NOTE]
> Only works with three.js r166 or higher.

### .maxBytesSize

```js
maxBytesSize: number
```

Maximum total bytes before eviction is triggered.

> [!NOTE]
> Only works with three.js r166 or higher.

### .unloadPercent

```js
unloadPercent: number
```

Fraction of excess items/bytes to unload per eviction pass.


### .autoMarkUnused

```js
autoMarkUnused: boolean
```

If true, items are automatically marked as unused at the start of each eviction pass.


### .isFull

```js
isFull(): boolean
```

Returns whether the cache has reached its maximum item count or byte size.


### .getMemoryUsage

```js
getMemoryUsage( item: any ): number
```

Returns the byte size registered for the given item, or 0 if not tracked.


### .setMemoryUsage

```js
setMemoryUsage( item: any, bytes: number ): void
```

Sets the byte size for the given item, updating the total `cachedBytes` count.


### .add

```js
add( item: any, removeCb: ( item: any ) => void ): boolean
```

Adds an item to the cache. Returns false if the item already exists or the cache is full.


### .has

```js
has( item: any ): boolean
```

Returns whether the given item is in the cache.


### .remove

```js
remove( item: any ): boolean
```

Removes an item from the cache immediately, invoking its removal callback.
Returns false if the item was not in the cache.


### .setLoaded

```js
setLoaded( item: any, value: boolean ): void
```

Marks whether an item has finished loading. Unloaded items may be evicted early
when the cache is over its max size limits, even if they are marked as used.


### .markUsed

```js
markUsed( item: any ): void
```

Marks an item as used in the current frame, preventing it from being evicted.


### .markUnused

```js
markUnused( item: any ): void
```

Marks an item as unused, making it eligible for eviction.


### .markAllUnused

```js
markAllUnused(): void
```

Marks all items in the cache as unused.


### .isUsed

```js
isUsed( item: any ): boolean
```

Returns whether the given item is currently marked as used.


### .unloadUnusedContent

```js
unloadUnusedContent(): void
```

Evicts unused items until the cache is within its min size and byte limits.
Items are sorted by `unloadPriorityCallback` before eviction.


### .scheduleUnload

```js
scheduleUnload(): void
```

Schedules `unloadUnusedContent` to run asynchronously via microtask.


## PNTSLoaderBase

_extends [`LoaderBase`](#loaderbase)_

Base loader for the PNTS (Point Cloud) tile format. Parses the PNTS binary
structure and extracts the feature and batch tables containing point positions,
colors, and normals. Extend this class to integrate PNTS loading into a specific
rendering engine.


### .parse

```js
parse(
	buffer: ArrayBuffer
): Promise<{version: string, featureTable: FeatureTable, batchTable: BatchTable}>
```

Parses a PNTS buffer and returns the raw tile data.


## PriorityQueue

Priority queue for scheduling async work with a concurrency limit. Items are
sorted by `priorityCallback` and dispatched up to `maxJobs` at a time.


### .maxJobs

```js
maxJobs: number
```

Maximum number of jobs that can run concurrently.


### .autoUpdate

```js
autoUpdate: boolean
```

If true, job runs are automatically scheduled after `add` and after each job completes.


### .priorityCallback

```js
priorityCallback: ( a: any, b: any ) => number | null
```

Comparator used to sort queued items. Higher-priority items should sort last
(i.e. return positive when `itemA` should run before `itemB`). Defaults to `null`.


### .schedulingCallback

```js
schedulingCallback: ( func: function ) => void
```

Callback used to schedule when to run jobs next, so more work doesn't happen in a
single frame than there is time for. Defaults to `requestAnimationFrame`. Should be
overridden in scenarios where `requestAnimationFrame` is not reliable, such as when
running in WebXR.


### .sort

```js
sort(): void
```

Sorts the pending item list using `priorityCallback`, if set.


### .has

```js
has( item: any ): boolean
```

Returns whether the given item is currently queued.


### .add

```js
add( item: any, callback: ( item: any ) => Promise<any> | any ): Promise<any>
```

Adds an item to the queue and returns a Promise that resolves when the item's
callback completes, or rejects if the item is removed before running.


### .remove

```js
remove( item: any ): void
```

Removes an item from the queue, rejecting its promise with `PriorityQueueItemRemovedError`.


### .removeByFilter

```js
removeByFilter( filter: ( item: any ) => boolean ): void
```

Removes all queued items for which `filter` returns true.


### .tryRunJobs

```js
tryRunJobs(): void
```

Immediately attempts to dequeue and run pending jobs up to `maxJobs` concurrency.


### .scheduleJobRun

```js
scheduleJobRun(): void
```

Schedules a deferred call to `tryRunJobs` via `schedulingCallback`.


## PriorityQueueItemRemovedError

_extends `Error`_

Error thrown when a queued item's promise is rejected because the item was removed
before its callback could run.


## TilesRendererBase

Base class for 3D Tiles renderers. Manages tile loading, caching, traversal,
and a plugin system for extending rendering behavior. Engine-specific renderers
extend this class to add camera projection, scene management, and tile display.


### events

```js
// Fired when the renderer determines a new render is required — e.g. after a tile loads.
{ type: 'needs-update' }

// Fired when any tile content (model or external tileset) finishes loading.
{ type: 'load-content' }

// Fired when any tileset JSON finishes loading.
{ type: 'load-tileset', tileset: Tileset, url: string }

// Fired when the root tileset JSON finishes loading.
{ type: 'load-root-tileset', tileset: Tileset, url: string }

// Fired when tile downloads begin after a period of inactivity.
{ type: 'tiles-load-start' }

// Fired when all pending tile downloads and parses have completed.
{ type: 'tiles-load-end' }

// Fired when a tile content download begins.
{ type: 'tile-download-start', tile: Tile, uri: string }

// Fired when a tile's renderable content (model/scene) is created.
// The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
{ type: 'load-model', scene: Object, tile: Tile, url: string }

// Fired when a tile's renderable content is about to be removed and destroyed.
// The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
{ type: 'dispose-model', scene: Object, tile: Tile }

// Fired when a tile transitions between visible and hidden.
// The `scene` type is engine-specific (e.g. `THREE.Group` in three.js).
{ type: 'tile-visibility-change', scene: Object, tile: Tile, visible: boolean }

// Fired at the start of each `update()` call, before traversal begins.
{ type: 'update-before' }

// Fired at the end of each `update()` call, after traversal completes.
{ type: 'update-after' }

// Fired when a tile or tileset fails to load.
{ type: 'load-error', tile: Tile | null, error: Error, url: string | URL }
```

### .root

```js
readonly root: Tile | null
```

Root tile of the loaded root tileset, or null if not yet loaded.


### .loadProgress

```js
readonly loadProgress: number
```

Fraction of tiles loaded since the last idle state, from 0 (nothing loaded) to 1 (all loaded).


### .rootTileset

```js
readonly rootTileset: Tileset | null
```

The loaded root tileset object, or null if not yet loaded.


### .fetchOptions

```js
fetchOptions: RequestInit
```

Options passed to `fetch` when loading tile and tileset resources.


### .visibleTiles

```js
readonly visibleTiles: Set<Tile>
```

Set of all tiles that are currently visible.


### .activeTiles

```js
readonly activeTiles: Set<Tile>
```

Set of all tiles that are currently active (displayed as a stand-in while children load).


### .lruCache

```js
lruCache: LRUCache
```

LRU cache managing loaded tile lifecycle and memory eviction.

> [!NOTE]
> Cannot be replaced once `update()` has been called for the first time.

### .downloadQueue

```js
downloadQueue: PriorityQueue
```

Priority queue controlling concurrent tile downloads. Max jobs defaults to `25`.

> [!NOTE]
> Cannot be replaced once `update()` has been called for the first time.

### .parseQueue

```js
parseQueue: PriorityQueue
```

Priority queue controlling concurrent tile parsing. Max jobs defaults to `5`.

> [!NOTE]
> Cannot be modified once `update()` has been called for the first time.

### .processNodeQueue

```js
processNodeQueue: PriorityQueue
```

Priority queue for expanding and initializing tiles for traversal. Max jobs defaults to `25`.

> [!NOTE]
> Cannot be replaced once `update()` has been called for the first time.

### .stats

```js
stats: Object
```

Loading and rendering statistics updated each frame. Fields:
- `inCache` — tiles currently in the LRU cache
- `queued` — tiles queued for download
- `downloading` — tiles currently downloading
- `parsing` — tiles currently being parsed
- `loaded` — tiles that have finished loading
- `failed` — tiles that failed to load
- `inFrustum` — tiles inside the camera frustum after the last update
- `used` — tiles visited during the last traversal
- `active` — tiles currently set as active
- `visible` — tiles currently visible


### .errorTarget

```js
errorTarget: number
```

Target screen-space error in pixels to aim for when updating the geometry. Tiles will
not render if they are below this level of screen-space error. See the
[geometric error section](https://github.com/CesiumGS/3d-tiles/tree/master/specification#geometric-error)
of the 3D Tiles specification for more information.


### .displayActiveTiles

```js
displayActiveTiles: boolean
```

"Active tiles" are those that are loaded and available but not necessarily visible.
These tiles are useful for raycasting off-camera or for casting shadows. Active tiles
not currently in a camera frustum are removed from the scene as an optimization.
Setting this to `true` keeps them in the scene so they can be rendered from an outside
camera view not accounted for by the tiles renderer.


### .maxDepth

```js
maxDepth: number
```

Maximum depth in the tile hierarchy to traverse. Tiles deeper than this are skipped.


### .optimizedLoadStrategy

```js
optimizedLoadStrategy: boolean
```

**Experimental.** Enables an optimized tile loading strategy that loads only the tiles
needed for the current view, reducing memory usage and improving initial load times.
Tiles are loaded independently based on screen-space error without requiring all parent
tiles to load first. Prevents visual gaps and flashing during camera movement.

Based in part on [Cesium Native tile selection](https://cesium.com/learn/cesium-native/ref-doc/selection-algorithm-details.html).

Default is `false`, which uses the previous approach of loading all parent and sibling
tiles for guaranteed smooth transitions.

> [!WARNING]
> Setting is currently incompatible with plugins that split tiles and on-the-fly generate and
> dispose of child tiles including the `ImageOverlayPlugin` `enableTileSplitting` setting,
> `QuantizedMeshPlugin`, & `ImageFormatPlugin` subclasses (XYZ, TMS, etc). Any tile sets
> that share caches or queues must also use the same setting.

### .loadSiblings

```js
loadSiblings: boolean
```

**Experimental.** When `true`, sibling tiles are loaded together to prevent gaps during
camera movement. When `false`, only visible tiles are loaded, minimizing memory but
potentially causing brief gaps during rapid movement.

Only applies when `optimizedLoadStrategy` is enabled.


### .maxTilesProcessed

```js
maxTilesProcessed: number
```

The number of tiles to process immediately when traversing the tile set to determine
what to render. Lower numbers prevent frame hiccups caused by processing too many tiles
at once when a new tile set is available, while higher values process more tiles
immediately so data can be downloaded and displayed sooner.


### .constructor

```js
constructor( url = null: string )
```

### .registerPlugin

```js
registerPlugin( plugin: Object ): void
```

Registers a plugin with this renderer. Plugins are inserted in priority order and
receive lifecycle callbacks throughout the tile loading and rendering process.
A plugin instance may only be registered to one renderer at a time.


### .unregisterPlugin

```js
unregisterPlugin( plugin: Object | string ): boolean
```

Removes a registered plugin. Calls `plugin.dispose()` if defined.
Accepts either the plugin instance or its string name.
Returns true if the plugin was found and removed.


### .getPluginByName

```js
getPluginByName( name: string ): Object | null
```

Returns the first registered plugin whose `name` property matches, or null.


### .traverse

```js
traverse(
	beforecb: ( tile: Tile, parent: Tile | null, depth: number ) => boolean | null,
	aftercb: ( tile: Tile, parent: Tile | null, depth: number ) => void | null
): void
```

Iterates over all tiles in the loaded hierarchy. `beforecb` is called before
descending into a tile's children; returning true from it skips the subtree.
`aftercb` is called after all children have been visited.


### .getAttributions

```js
getAttributions(
	target: Array<{type: string, value: any}>
): Array<{type: string, value: any}>
```

Collects attribution data from all registered plugins into `target` and returns it.


### .update

```js
update(): void
```

Runs the tile traversal and update loop. Should be called once per frame after
camera matrices have been updated. Triggers tile loading, visibility updates,
and LRU cache eviction.


### .resetFailedTiles

```js
resetFailedTiles(): void
```

Resets any tiles that previously failed to load so they will be retried on the next `update`.


### .dispose

```js
dispose(): void
```

Disposes all loaded tiles and unregisters all plugins. The renderer should not
be used after calling this.


### .dispatchEvent

```js
dispatchEvent( e: Object ): void
```

Dispatches an event to all registered listeners for the given event type.


### .addEventListener

```js
addEventListener( name: string, callback: ( event: Object ) => void ): void
```

Registers a listener for the given event type.


### .removeEventListener

```js
removeEventListener( name: string, callback: ( event: Object ) => void ): void
```

Removes a previously registered event listener.


## Tile

A 3D Tiles tile with both spec fields (from tileset JSON) and renderer-managed state.


### .boundingVolume

```js
boundingVolume: Object
```

Bounding volume. Has either a `box` (12-element array) or `sphere` (4-element array) field.

### .geometricError

```js
geometricError: number
```

Error in meters introduced if this tile is not rendered.

### .parent

```js
parent: Tile | null
```

Parent tile, or null for the root.

### .children

```js
children?: Array<Tile>
```

Child tiles.

### .content

```js
content?: Object
```

Loadable content URI reference.

### .refine

```js
refine?: 'REPLACE' | 'ADD'
```

Refinement strategy; inherited from the parent if omitted.

### .transform

```js
transform?: Array<number>
```

Optional 4x4 column-major transform matrix.

### .extensions

```js
extensions?: Object
```

Extension-specific objects.

### .extras

```js
extras?: Object
```

Extra application-specific data.

### .internal

```js
internal: TileInternalData
```

Internal renderer state.

### .traversal

```js
traversal: TileTraversalData
```

Per-frame traversal state.

## TileInternalData

Internal renderer state added to each tile during preprocessing.


### .hasContent

```js
hasContent: boolean
```

Whether the tile has a content URI.

### .hasRenderableContent

```js
hasRenderableContent: boolean
```

Whether the tile content is a renderable model (not an external tileset).

### .hasUnrenderableContent

```js
hasUnrenderableContent: boolean
```

Whether the tile content is an external tileset JSON.

### .loadingState

```js
loadingState: number
```

Current loading state constant (UNLOADED, QUEUED, LOADING, PARSING, LOADED, or FAILED).

### .basePath

```js
basePath: string
```

Base URL used to resolve relative content URIs.

### .depth

```js
depth: number
```

Depth of this tile in the full tile hierarchy.

### .depthFromRenderedParent

```js
depthFromRenderedParent: number
```

Depth from the nearest ancestor with renderable content.

### .isVirtual

```js
isVirtual: boolean
```

Whether this tile was synthetically generated by a plugin.

### .virtualChildCount

```js
virtualChildCount: number
```

Number of virtual children appended to this tile by plugins.

## Tileset

A loaded 3D Tiles tileset JSON object.


### .asset

```js
asset: Object
```

Metadata about the tileset. Contains `version` (string) and optional `tilesetVersion` (string).

### .geometricError

```js
geometricError: number
```

Error in meters for the entire tileset.

### .root

```js
root: Tile
```

The root tile.

### .extensionsUsed

```js
extensionsUsed?: Array<string>
```

Names of extensions used somewhere in the tileset.

### .extensionsRequired

```js
extensionsRequired?: Array<string>
```

Names of extensions required to load the tileset.

### .properties

```js
properties?: Object
```

Metadata about per-feature properties.

### .extensions

```js
extensions?: Object
```

Extension-specific objects.

### .extras

```js
extras?: Object
```

Extra application-specific data.

## TileTraversalData

Per-frame traversal state updated on each tile during `TilesRendererBase.update`.


### .distanceFromCamera

```js
distanceFromCamera: number
```

Distance from the tile bounds to the nearest active camera.

### .error

```js
error: number
```

Screen space error computed for this tile.

### .inFrustum

```js
inFrustum: boolean
```

Whether the tile was within the camera frustum on the last update.

### .isLeaf

```js
isLeaf: boolean
```

Whether this tile is a leaf node in the used tile tree.

### .used

```js
used: boolean
```

Whether this tile was visited during the last update traversal.

### .usedLastFrame

```js
usedLastFrame: boolean
```

Whether this tile was visited in the previous frame.

### .visible

```js
visible: boolean
```

Whether this tile is currently visible (loaded, in frustum, meets SSE).

## Functions

### getUrlExtension

```js
getUrlExtension( url: string ): string
```

Returns the file extension of the path component of a URL

