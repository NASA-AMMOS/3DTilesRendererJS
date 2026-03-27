<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/babylonjs

## B3DMLoader

_extends [`B3DMLoaderBase`](../../core/renderer/API.md#b3dmloaderbase)_

Babylon.js loader for B3DM (Batched 3D Model) tile content. Parses the B3DM binary
structure and delegates embedded GLB loading to GLTFLoader.


### .scene

```js
scene: Scene
```

The Babylon.js scene assets are loaded into.


### .adjustmentTransform

```js
adjustmentTransform: Matrix
```

Transform applied after loading to correct coordinate system orientation.


### .constructor

```js
constructor( scene: Scene )
```

### .parse

```js
parse( buffer: ArrayBuffer, uri: string ): Promise<Object>
```


## GLTFLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_

Babylon.js loader for GLTF and GLB tile content. Loads a buffer into a Babylon.js scene
and applies an optional adjustment transform for coordinate-system correction.


### .scene

```js
scene: Scene
```

The Babylon.js scene assets are loaded into.


### .adjustmentTransform

```js
adjustmentTransform: Matrix
```

Transform applied after loading to correct coordinate system orientation.


### .constructor

```js
constructor( scene: Scene )
```

### .parse

```js
parse(
	buffer: ArrayBuffer,
	uri: string,
	extension: string
): Promise<{scene: TransformNode, container: AssetContainer, metadata: (Object|null)}>
```


## TilesRenderer

_extends [`TilesRendererBase`](../../core/renderer/API.md#tilesrendererbase)_

Babylon.js implementation of the 3D Tiles renderer. Manages tile loading, caching, traversal,
and scene management using the Babylon.js scene graph and camera APIs. Dispatches all events
defined by TilesRendererBase via Babylon.js Observables.

> [!WARNING]
> Left-handed coordinate systems are not currently supported.

### .scene

```js
scene: Scene
```

The Babylon.js scene tiles are rendered into.


### .group

```js
group: TransformNode
```

Root node that all loaded tile scenes are parented to.


### .checkCollisions

```js
checkCollisions: boolean
```

Whether to enable collision checking on loaded tile meshes.


### .constructor

```js
constructor( url: string, scene: Scene )
```

### .dispose

```js
dispose(): void
```

Disposes the renderer, releasing all loaded tile content and the root transform node.

