<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/playcanvas

## B3DMLoader

_extends [`B3DMLoaderBase`](../../core/renderer/API.md#b3dmloaderbase)_

PlayCanvas loader for B3DM (Batched 3D Model) tile content. Parses the B3DM header and tables
and loads the embedded GLB with [GLTFLoader](GLTFLoader).


### .app

```js
app: AppBase
```

The PlayCanvas application the content is created for.


### .assetOptions

```js
assetOptions: Object | null
```

Options passed to the `container` asset, such as glTF parser callbacks.


### .renderOptions

```js
renderOptions: Object | null
```

Options passed to the render components created for the content, such as `castShadows`.


### .constructor

```js
constructor( app: AppBase )
```

### .parse

```js
async parse( buffer: ArrayBuffer, url: string ): Promise<Object>
```


## GLTFLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_

PlayCanvas loader for GLTF and GLB tile content. The already downloaded buffer is passed to the
engine as the contents of a `container` asset, so the engine's glTF parser and extensions are
used without fetching the file again.


### .app

```js
app: AppBase
```

The PlayCanvas application the content is created for.


### .assetOptions

```js
assetOptions: Object | null
```

Options passed to the `container` asset, such as glTF parser callbacks.


### .renderOptions

```js
renderOptions: Object | null
```

Options passed to the render components created for the content, such as `castShadows`.


### .constructor

```js
constructor( app: AppBase )
```

### .parse

```js
async parse(
	buffer: ArrayBuffer,
	url: string
): Promise<{scene: Entity, container: Asset, gltf: Object, asset: Object}>
```


## OBB

An oriented bounding box: an axis-aligned box from `min` to `max` in the frame given by
`transform`.


### .update

```js
update(): void
```

Recomputes the inverse transform, corners and planes after `min`, `max` or `transform` change.


### .clampPoint

```js
clampPoint( point: Vec3, target: Vec3 ): Vec3
```

Returns the point inside the box that is closest to the given point.


### .distanceToPoint

```js
distanceToPoint( point: Vec3 ): number
```

Returns the distance from the box to the point, or 0 when the point is inside.


### .intersectsFrustum

```js
intersectsFrustum(
	frustumPlanes: Array<Plane>,
	frustumPoints: Array<Vec3>
): boolean
```


## TileBoundingVolume

The bounding volume of a tile, in the frame of the tileset. Supports the `sphere` and `box`
volume types.


### .sphere

```js
sphere: BoundingSphere | null
```


### .obb

```js
obb: OBB | null
```


### .setSphereData

```js
setSphereData(
	x: number,
	y: number,
	z: number,
	radius: number,
	transform: Mat4
): void
```


### .setObbData

```js
setObbData( data: Array<number>, transform: Mat4 ): void
```


### .distanceToPoint

```js
distanceToPoint( point: Vec3 ): number
```

Returns the distance from the volume to the point, or 0 when the point is inside.


### .intersectsFrustum

```js
intersectsFrustum(
	frustum: Frustum,
	frustumPlanes: Array<Plane>,
	frustumPoints: Array<Vec3>
): boolean
```


## TilesRenderer

_extends [`TilesRendererBase`](../../core/renderer/API.md#tilesrendererbase)_

PlayCanvas implementation of the 3D Tiles renderer. Manages tile loading, caching, traversal and
the PlayCanvas entity hierarchy. Tile content is loaded through the engine's glTF parser.

> [!WARNING]
> Only `glTF`, `GLB` and `B3DM` content, and `box` and `sphere` bounding volumes are
> supported.

### .app

```js
app: AppBase
```

The PlayCanvas application the tiles are created for.


### .group

```js
group: Entity
```

Root entity that all visible tiles are parented to. Add it to the scene hierarchy, and
transform it to place the tileset.


### .cameras

```js
cameras: Array<CameraComponent>
```

Cameras used to calculate the screen space error and visibility of tiles. Use
[TilesRenderer#setCamera](TilesRenderer#setCamera) and [TilesRenderer#deleteCamera](TilesRenderer#deleteCamera) to change it.


### .assetOptions

```js
assetOptions: Object | null
```

Options passed to the `container` asset of every tile, such as glTF parser callbacks.


### .renderOptions

```js
renderOptions: Object | null
```

Options passed to the render components created for every tile, such as `castShadows`
or `layers`.


### .constructor

```js
constructor( url: string, app: AppBase )
```

### .addEventListener

```js
addEventListener( type: string, listener: function ): void
```

Registers a listener for the given event type. The listener receives the event object.


### .hasEventListener

```js
hasEventListener( type: string, listener: function ): boolean
```


### .removeEventListener

```js
removeEventListener( type: string, listener: function ): void
```

Removes a previously registered listener.


### .dispatchEvent

```js
dispatchEvent( event: Object ): void
```


### .on

```js
on( type: string, listener: function ): this
```

Alias of [TilesRenderer#addEventListener](TilesRenderer#addEventListener), matching the PlayCanvas event API.


### .off

```js
off( type: string, listener: function ): this
```

Alias of [TilesRenderer#removeEventListener](TilesRenderer#removeEventListener), matching the PlayCanvas event API.


### .hasCamera

```js
hasCamera( camera: CameraComponent ): boolean
```


### .setCamera

```js
setCamera( camera: CameraComponent ): boolean
```

Adds a camera used to calculate tile visibility and screen space error. The render
resolution is read every frame: the size of the camera's render target in pixels, or the size
of the canvas in CSS pixels.


### .deleteCamera

```js
deleteCamera( camera: CameraComponent ): boolean
```


### .forEachLoadedModel

```js
forEachLoadedModel( callback: function ): void
```

Calls the callback for every tile with loaded content.


### .dispose

```js
dispose(): void
```

Disposes the renderer, releasing all loaded tile content and the root entity.


## Functions

### disposeModel

```js
disposeModel(
	scene: Entity | null,
	asset: Asset,
	registry: AssetRegistry
): void
```

Releases the entity and every engine resource created for a loaded model.

