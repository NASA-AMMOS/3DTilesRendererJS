# 3d-tiles-renderer/babylonjs


## B3DMLoader

_extends [`B3DMLoaderBase`](../../core/renderer/API.md#b3dmloaderbase)_


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

> [!WARN]
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

