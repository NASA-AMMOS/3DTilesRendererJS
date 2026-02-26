# API

See the [plugins documentation](./PLUGINS.md) for GLTFLoader extension plugins, TilesRenderer plugins, and extra classes.

## TilesRenderer

_extends `THREE.EventDispatcher` & [TilesRendererBase](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/core/TilesRendererBase.js), which can be used to implement a 3d tiles renderer in other engines. 

### events

```js
// Fired when a new root or child tileset is loaded.
{ type: 'load-tileset', tileset: Object, url: String }

// Fired when a tile model is loaded.
{ type: 'load-model', scene: THREE.Group, tile: Object }

// Fired when the content of a model is loaded. Fired along side the
// above two events.
{ type: 'load-content' }

// Fired when a tile model is disposed.
{ type: 'dispose-model', scene: THREE.Group, tile: Object }

// Fired when the tileset hierarchy is ready for "update to be called
// again due to new content having loaded or asynchronous processing finished.
{ type: 'needs-update' }

// Fired when a tiles visibility changes.
{ type: 'tile-visibility-change', scene: THREE.Group, tile: Object, visible: boolean }

// Fired when tiles start loading.
{ type: 'tiles-load-start' }

// Fired when all tiles finish loading.
{ type: 'tiles-load-end' }

// Fired when tile content begins downloading.
{ type: 'tile-download-start', tile: Object }

// Fired when a tile content or the root tileset fails to load.
{ type: 'load-error', tile: Object | null, error: Error, url: string | URL }

// Fired when a camera is added to be accounted for when traversing the tileset.
{ type: 'add-camera', camera: Camera }

// Fired when a camera is removed from being accounted for when traversing the tileset.
{ type: 'delete-camera', camera: Camera }

// Fired when the resolution being rendered to is changed for any tracked camera.
{ type: 'camera-resolution-change' }
```

### .fetchOptions

```js
fetchOptions = {} : Object
```

Options passed to `fetch` when loading tileset and model data.

### .errorTarget

```js
errorTarget = 6 : Number
```

The target screenspace error in pixels to target when updating the geometry. Tiles will not render if they have below this level of screenspace error. See the ["geometric error" section in the 3d tiles specification](https://github.com/CesiumGS/3d-tiles/tree/master/specification#geometric-error) for more information.

### .maxDepth

```js
maxDepth = Infinity : Number
```

The max depth to which tiles will be loaded and rendered. Setting it to `1` will only render the root tile. If the tile at depth `maxDepth` is an empty tile then the next set of visible children will be rendered.

### .displayActiveTiles

```js
displayActiveTiles = false : Boolean
```

"Active tiles" are those that are loaded and available but not necessarily visible. These tiles are useful for raycasting off camera or for casting shadows.

Active tiles not currently visible in a camera frustum are removed from the scene as an optimization. Setting `displayActiveTiles` to true will keep them in the scene to be rendered from an outside camera view not accounted for by the tiles renderer.

### .optimizedLoadStrategy

```js
optimizedLoadStrategy = false : Boolean
```

Enables an **experimental** optimized tile loading strategy that loads only the tiles needed for the current view, reducing memory usage and improving initial load times. Tiles are loaded independently based on screen space error without requiring all parent tiles to load first. Prevents visual gaps and flashing during camera movement.

Based in part on [Cesium Native tile selection](https://cesium.com/learn/cesium-native/ref-doc/selection-algorithm-details.html).

Default is `false` which uses the previous approach of loading all parent and sibling tiles for guaranteed smooth transitions.

> [!WARN]
> Setting is currently incompatible with plugins that split tiles and on-the-fly generate and dispose of child tiles including the ImageOverlaysPlugin enableTileSplitting setting, QuantizedMeshPlugin, & ImageFormatPlugins (XYZ, TMS, etc). Any tile sets that share caches or queues must also use the same setting.

### .loadSiblings

```js
loadSiblings = true : Boolean
```

**Experimental** setting that, when true, causes sibling tiles to together to prevent gaps during camera movement. When false, only visible tiles are loaded, minimizing memory but potentially causing brief gaps during rapid movement.

Only applies when `optimizedLoadStrategy` is enabled.

### .autoDisableRendererCulling

```js
autoDisableRendererCulling = true : Boolean
```

If true then all tile meshes automatically have their [frustumCulled](https://threejs.org/docs/index.html#api/en/core/Object3D.frustumCulled) field set to false. This is useful particularly when using one camera because the tiles renderer automatically performs it's own frustum culling on visible tiles. If [displayActiveTiles](#displayActiveTiles) is true or multiple cameras are being used then you may consider setting this to false.

### .maxProcessedTiles

```js
maxProcessedTiles = 250 : Number
```

The number of tiles to process up to immediately when traversing the tile set to determine what to render. Lower numbers prevent frame hiccups caused by processing too many tiles at once when a new tile set is available while higher values will process tiles more tiles immediately allowing data to be downloaded and data to be displayed sooner.

### .lruCache

```js
lruCache = new LRUCache() : LRUCache
```

_NOTE: This cannot be set once [update](#update) is called for the first time._

### .downloadQueue

```js
downloadQueue = new PriorityQueue : PriorityQueue
```

_NOTE: This cannot be set once [update](#update) is called for the first time._

Queue for downloading tile content. Max jobs defaults to `25`.

### .parseQueue

```js
parseQueue = new PriorityQueue : PriorityQueue
```

_NOTE: This cannot be modified once [update](#update) is called for the first time._

Queue for parsing downloaded tile content. Max jobs defaults to `5`.

### .processNodeQueue

```js
processNodeQueue = new PriorityQueue : PriorityQueue
```

_NOTE: This cannot be set once [update](#update) is called for the first time._

Queue for expanding and initializing tiles for traversal. Max jobs defaults to `25`.

### .group

```js
group : Group
```

The container group for the 3d tiles. Add this to the three.js scene in order to render it. The group includes an additional `matrixWorldInverse` field for transforming objects into the local tileset frame.

### .manager

```js
manager : LoadingManager
```

The manager used when loading tile geometry.

### .loadProgress

```js
readOnly loadProgress : Number
```

Returns the total load progress between `[0, 1]`. Progress is measured since the last set of loading tiles completed.

### .ellipsoid

```js
readonly ellipsoid : Ellipsoid
```

A definition on the ellipsoid used for the tileset. Defaults to the WGS84 ellipsoid and is modified if the `3DTILES_ELLIPSOID` plugin is present. Specified in the local frame of [TilesRenderer.group](#group).

### .constructor

```js
constructor( url = null : String | null )
```

Takes the url of the `tileset.json` for the tileset to be rendered.

### .update

```js
update() : void
```

Updates the tiles to render and kicks off loads for the appropriate tiles in the 3d tileset.

Both `group.matrixWorld` and all cameras world matrices are expected to be up to date before this is called.

### .resetFailedTiles

```js
resetFailedTiles() : void
```

If any tiles failed to load due to server or network issues then they will not be retried by automatically. This function clears all failed tile states so unloaded tiles can be retried again.

### .getBoundingBox

```js
getBoundingBox( box : Box3 ) : boolean
```

Sets `box` to the axis aligned root bounding box of the tileset in the [group](#group) frame. Returns `false` if the tile root is not loaded and the bounding box cannot be set.

### .getOrientedBoundingBox

```js
getOrientedBoundingBox( box : Box3, boxTransform : Matrix4 ) : boolean;
```

Sets `box` and `boxTransform` to the bounds and matrix that describe the oriented bounding box that encapsulates the root of the tileset. Returns `false` if the tile root is not loaded and the bounding box cannot be set.

### .getBoundingSphere

```js
getBoundingSphere( sphere : Sphere ) : boolean;
```

Sets `sphere` to the bounding sphere that encapsulates the root of the tileset. Returns `false` if the tile root is not loaded and the bounding sphere cannot be set.

### .hasCamera

```js
hasCamera( camera : Camera ) : boolean
```

Returns `true` if the camera has already been set on the renderer.

### .setCamera

```js
setCamera( camera : Camera ) : boolean
```

Adds the camera to the camera to be accounted for when traversing the tileset. Returns `false` if the camera is already being tracked. Returns `true` otherwise.

### .deleteCamera

```js
deleteCamera( camera : Camera ) : boolean
```

Removes the given camera from being accounted for when traversing the tileset. Returns `false` if the camera was not tracked.

### .setResolution

```js
setResolution( camera : Camera, resolution : Vector2 ) : boolean
setResolution( camera : Camera, x : number, y : number ) : boolean
```

Sets the resolution being rendered to for the given camera. `setCamera` must be called first. Returns `false` if the camera is not already being used by the TilesRenderer.

### .setResolutionFromRenderer

```js
setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : boolean
```

Sets the resolution being rendered to for the given camera via renderer which accounts for canvas size. The pixel ratio is ignored to help normalize the amount of data loaded and performance across devices. `setCamera` must be called first. Returns `false` if the camera is not already being used by the TilesRenderer.

### .forEachLoadedModel

```js
forEachLoadedModel( callback : ( scene : Object3D, tile : object ) => void ) : void
```

Fires the callback for every loaded scene in the hierarchy with the associated tile as the second argument. This can be used to update the materials of all loaded meshes in the tileset.

### .registerPlugin

```js
registerPlugin( plugin : TilesPlugin ) : void
```

Register a plugin to the TilesRenderer. See the [plugins documentation](./PLUGINS.md) for more information.

### .unregisterPlugin

```js
unregisterPlugin( plugin : TilesPlugin | String ) : Boolean
```

Removes a plugin from the tiles renderer. Returns `true` if the plugin was in the renderer and was removed. Returns `false` otherwise.

### .getPluginByName

```js
getPluginByName( name : string ) : TilesPlugin
```

Returns the plugin with the given name if it has been registered. Returns the first one if multiple have been registered.

### .getAttributions

```js
getAttributions( target = [] : Array ) : Array<{
	type: string,
	value: any,
}>
```

Returns a list of attributions for the data in the tileset. The list can change when tile visibility changes.

The "type" can be a "string", "html", or "image" depending on the type of attribution. Google Photorealistic Tiles, for example, returns a list of sources as a string.

### .dispose

```js
dispose() : void
```

Disposes of all the tiles in the renderer. Calls dispose on all materials, textures, and geometries that were loaded by the renderer and subsequently calls [onDisposeModel](#onDisposeModel) for any loaded tile model.

## PriorityQueue

Priority-sorted queue to prioritize file downloads and parsing.

### .maxJobs

```js
maxJobs = 6 : number
```

The maximum number of jobs to be processing at once.

### .priorityCallback

```js
priorityCallback = null : ( itemA, itemB ) => Number
```

Function to derive the job priority of the given item. Higher priority values get processed first (ie return 1 to have itemA processed first).

### .schedulingCallback

```js
schedulingCallback = requestAnimationFrame : ( cb : Function ) => void
```

A function used for scheduling when to run jobs next so more work doesn't happen in a single frame than there is time for -- defaults to the next frame. This should be overridden in scenarios where requestAnimationFrame is not reliable, such as when running in WebXR. See the VR demo for one example on how to handle this with WebXR.

## LRUCache

Utility class for the TilesRenderer to keep track of currently used items so rendered items will not be unloaded.

### .maxSize

```js
maxSize = 800 : number
```

The maximum cached size in number of items. If that current amount of cached items is equal to this value then no more items can be cached.

### .minSize

```js
minSize = 600 : number
```

The minimum cache size in number of items. Above this cached data will be unloaded if it's unused.

### .maxBytesSize

```js
maxByteSize = 0.4 * 2**30 : Number
```

The maximum cached size in bytes. If that current amount of cached bytes is equal to this value then no more items can be cached.

_NOTE: Only works with three >= 0.166.0._

### .minBytesSize

```js
minByteSize = 0.3 * 2**30 : Number
```

The minimum cache size in number of bytes. Above this cached data will be unloaded if it's unused.

_NOTE: Only works with three >= 0.166.0._

### .unloadPercent

```js
unloadPercent = 0.05 : number
```

The maximum percentage of [minSize](#minSize) to unload during a given frame.

### .unloadPriorityCallback

```js
unloadPriorityCallback = null : ( itemA, itemB ) => Number
```

Function to derive the unload priority of the given item. Higher priority values get unloaded first (ie return 1 to have itemA removed first).

## BatchTable

### .getKeys

```js
getKeys() : Array<String>
```

Returns the keys of all the data in the batch table.

### .getDataFromId

```js
getDataFromId( id: Number, target?: Object ) : Object;
```

Returns an object definition for all properties of the batch table and its extensions for a given `id`.
A `target` object can be specified to store the result. Throws an error if the id is out of the batch table bounds.

### .getPropertyArray

```js
getPropertyArray( key : String ) : Array | TypedArray | null
```

Returns an array of data associated with the `key` passed into the function. Returns null if the key is not in the table.
