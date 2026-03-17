<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/three/plugins


## BaseRegion


### .constructor

```js
constructor( {
	errorTarget = 10: number,
	mask = false: boolean,
} )
```

## BatchedTilesPlugin

> [!WARN]
> All tile geometry rendered with `BatchedMesh` will use the same material and only a single
> material map is supported. Only tile geometry containing a single mesh is supported. Not
> compatible with plugins that modify mesh materials or rely on bespoke mesh data (e.g.
> `TilesFadePlugin`, `DebugTilesPlugin`, GLTF Metadata extensions).

### .constructor

```js
constructor( {
	renderer: WebGLRenderer,
	instanceCount = 500: number,
	vertexCount = 1000: number,
	indexCount = 1000: number,
	expandPercent = 0.25: number,
	maxInstanceCount = Infinity: number,
	discardOriginalContent = true: boolean,
	textureSize = null: number | null,
	material = null: Material | null,
} )
```

## DebugTilesPlugin


### .getDebugColor

```js
getDebugColor: ( val: number, target: Color ) => void
```

Maps a normalized [0, 1] value to a `Color` for debug visualizations. Defaults to
a black-to-white gradient. Replace with a custom function to use a different color
ramp.


### .constructor

```js
constructor( {
	displayBoxBounds = false: boolean,
	displaySphereBounds = false: boolean,
	displayRegionBounds = false: boolean,
	displayParentBounds = false: boolean,
	colorMode = ColorModes.NONE: number,
	boundsColorMode = ColorModes.NONE: number,
	maxDebugDepth = -1: number,
	maxDebugDistance = -1: number,
	maxDebugError = -1: number,
	customColorCallback = null: function | null,
	unlit = false: boolean,
	enabled = true: boolean,
} )
```

### .update

```js
update(): void
```

Applies the current plugin field values to all visible tile geometry. Call this
after modifying properties such as `colorMode`, `displayBoxBounds`, or
`displayParentBounds` when `TilesRenderer.update` is not being called every frame
so changes can be reflected.


## DeepZoomImagePlugin


### .constructor

```js
constructor( {
	url?: string,
	center = false: boolean,
	useRecommendedSettings = true: boolean,
} )
```

## GLTFCesiumRTCExtension


## GLTFExtensionsPlugin


### .constructor

```js
constructor( {
	metadata = true: boolean,
	rtc = true: boolean,
	plugins = []: Array,
	dracoLoader = null: Object,
	ktxLoader = null: Object,
	meshoptDecoder = null: Object,
	autoDispose = true: boolean,
} )
```

## GLTFMeshFeaturesExtension


### .constructor

```js
constructor( parser: Object )
```

## GLTFStructuralMetadataExtension

> [!NOTE]
> 64-bit integer types are not fully supported.

### .constructor

```js
constructor( parser: Object )
```

## ImageOverlayPlugin


### .constructor

```js
constructor( {
	renderer: WebGLRenderer,
	overlays = []: Array,
	resolution = 256: number,
	enableTileSplitting = true: boolean,
} )
```

### .addOverlay

```js
addOverlay( overlay: Object, order = null: number | null ): void
```

Adds an image overlay source to the plugin. The `order` parameter controls the draw
order among overlays; lower values are drawn first. If omitted, the overlay is appended
after all existing overlays.


### .setOverlayOrder

```js
setOverlayOrder( overlay: Object, order: number ): void
```

Updates the draw order for the given overlay.


### .deleteOverlay

```js
deleteOverlay( overlay: Object ): void
```

Removes the given overlay from the plugin.


## LoadRegionPlugin


## MeshFeatures


### .constructor

```js
constructor( geometry: BufferGeometry, textures: Array<Texture>, data: Object )
```

### .getTextures

```js
getTextures(): Array<Texture>
```

Returns an indexed list of all textures used by features in the extension.


### .getFeatureInfo

```js
getFeatureInfo(): Array<FeatureInfo>
```

Returns the feature ID info for each feature set defined on this primitive.


### .getFeaturesAsync

```js
getFeaturesAsync(
	triangle: number,
	barycoord: Vector3
): Promise<Array<(number|null)>>
```

Performs the same function as `getFeatures` but reads texture data asynchronously.


### .getFeatures

```js
getFeatures( triangle: number, barycoord: Vector3 ): Array<(number|null)>
```

Returns the list of feature IDs at the given point on the mesh. Takes the triangle
index from a raycast result and a barycentric coordinate. Results are indexed in the
same order as the feature info returned by `getFeatureInfo()`.


### .dispose

```js
dispose(): void
```

Disposes all textures used by this instance.


## OBBRegion


### .constructor

```js
constructor( {
	obb?: OBB,
	errorTarget = 10: number,
	mask = false: boolean,
} )
```

## QuantizedMeshPlugin


### .constructor

```js
constructor( {
	useRecommendedSettings = true: boolean,
	skirtLength = null: number | null,
	smoothSkirtNormals = true: boolean,
	generateNormals = true: boolean,
	solid = false: boolean,
} )
```

## RayRegion


### .constructor

```js
constructor( {
	ray?: Ray,
	errorTarget = 10: number,
	mask = false: boolean,
} )
```

## ReorientationPlugin


### .constructor

```js
constructor( {
	lat = null: number | null,
	lon = null: number | null,
	height = 0: number,
	up = '+z': string,
	recenter = true: boolean,
	azimuth = 0: number,
	elevation = 0: number,
	roll = 0: number,
} )
```

### .transformLatLonHeightToOrigin

```js
transformLatLonHeightToOrigin(
	lat: number,
	lon: number,
	height = 0: number,
	azimuth = 0: number,
	elevation = 0: number,
	roll = 0: number
): void
```

Centers the tileset such that the given coordinates are positioned at the origin
with X facing west and Z facing north.


## SphereRegion


### .constructor

```js
constructor( {
	sphere?: Sphere,
	errorTarget = 10: number,
	mask = false: boolean,
} )
```

## StructuralMetadata


### .constructor

```js
constructor( definition: Object, textures: Array<Texture>, buffers: Array<ArrayBuffer>, nodeMetadata = null: Object | null, object = null: Object3D | null )
```

### .getPropertyTableData

```js
getPropertyTableData(
	tableIndices: number | Array<number>,
	ids: number | Array<number>,
	target = null: Object | Array | null
): Object | Array
```

Returns data from one or more property tables. Pass a single table index and row ID to
get one object, or parallel arrays of table indices and row IDs to get an array of
results. Each returned object conforms to the structure class referenced in the schema.


### .getPropertyTableInfo

```js
getPropertyTableInfo(
	tableIndices = null: Array<number> | null
): Array<{name: string, className: string}> | Object
```

Returns name and class information for one or more property tables. Defaults to all
tables when `tableIndices` is `null`.


### .getPropertyTextureData

```js
getPropertyTextureData(
	triangle: number,
	barycoord: Vector3,
	target = []: Array
): Array
```

Returns data from property textures at the given point on the mesh. Takes the triangle
index and barycentric coordinate from a raycast result. See `MeshFeatures.getFeatures`
for how to obtain these values.


### .getPropertyTextureDataAsync

```js
getPropertyTextureDataAsync(
	triangle: number,
	barycoord: Vector3,
	target = []: Array
): Promise<Array>
```

Returns the same data as `getPropertyTextureData` but performs texture reads
asynchronously.


### .getPropertyTextureInfo

```js
getPropertyTextureInfo(
): Array<{name: string, className: string, properties: Object}>
```

Returns information about the property texture accessors, including their class names
and per-property channel/texcoord mappings.


### .getPropertyAttributeData

```js
getPropertyAttributeData( attributeIndex: number, target = []: Array ): Array
```

Returns data stored as property attributes for the given vertex index.


### .getPropertyAttributeInfo

```js
getPropertyAttributeInfo(): Array<{name: string, className: string}>
```

Returns name and class information for all property attribute accessors.


### .dispose

```js
dispose(): void
```

Disposes all texture, table, and attribute accessors.


## TileCompressionPlugin


### .constructor

```js
constructor( {
	generateNormals = false: boolean,
	disableMipmaps = true: boolean,
	compressIndex = true: boolean,
	compressNormals = false: boolean,
	compressUvs = false: boolean,
	compressPosition = false: boolean,
	uvType = Int8Array: TypedArrayConstructor,
	normalType = Int8Array: TypedArrayConstructor,
	positionType = Int16Array: TypedArrayConstructor,
} )
```

## TileFlatteningPlugin


### .hasShape

```js
hasShape( mesh: Object3D ): boolean
```

Returns whether the given object has already been added as a shape.


### .addShape

```js
addShape(
	mesh: Object3D,
	direction: Vector3,
	options: Object,
	options.threshold = Infinity: number
): void
```

Adds the given mesh as a flattening shape. All coordinates must be in the tileset's local
frame. Throws if the shape has already been added.


### .updateShape

```js
updateShape( mesh: Object3D ): void
```

Notifies the plugin that a shape's geometry or transform has changed and tile
flattening needs to be regenerated.


### .deleteShape

```js
deleteShape( mesh: Object3D ): boolean
```

Removes the given shape and triggers tile regeneration.


### .clearShapes

```js
clearShapes(): void
```

Removes all shapes and resets flattened tiles to their original positions.


## TilesFadePlugin


### .constructor

```js
constructor( {
	fadeDuration = 250: number,
	maximumFadeOutTiles = 50: number,
	fadeRootTiles = false: boolean,
} )
```

## TMSTilesPlugin

> [!NOTE]
> Most TMS generation implementations (including CesiumJS and Ion) do not correctly support the Origin tag and tile index offsets.

### .constructor

```js
constructor( {
	url?: string,
} )
```

## UnloadTilesPlugin


### .estimatedGpuBytes

```js
estimatedGpuBytes: number
```

The number of bytes currently uploaded to the GPU for rendering. Compare to
`lruCache.cachedBytes` which reports all downloaded bytes including those not
yet on the GPU.


### .constructor

```js
constructor( {
	delay = 0: number,
	bytesTarget = 0: number,
} )
```

## UpdateOnChangePlugin


## WMSTilesPlugin


### .constructor

```js
constructor( {
	url?: string,
	layer?: string,
	crs?: string,
	format?: string,
	tileDimension?: number,
	styles?: string,
	version?: string,
} )
```

## WMTSTilesPlugin


### .constructor

```js
constructor( {
	capabilities?: Object,
	layer?: string,
	tileMatrixSet?: string,
	style?: string,
	dimensions?: Object,
} )
```

## XYZTilesPlugin


### .constructor

```js
constructor( {
	url?: string,
	levels?: number,
	tileDimension?: number,
	projection?: string,
} )
```

## CesiumIonAuthPlugin

_extends [`CesiumIonAuthPlugin`](../../core/plugins/API.md#cesiumionauthplugin)_


### .constructor

```js
constructor( {
	apiToken?: string,
	assetId = null: string | null,
	autoRefreshToken = false: boolean,
	useRecommendedSettings = true: boolean,
	assetTypeHandler?: function,
} )
```

## WMSCapabilitiesLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_


### .constructor

```js
constructor( manager: LoadingManager )
```

## WMTSCapabilitiesLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_


### .constructor

```js
constructor( manager: LoadingManager )
```

## WMTSImageSource

_extends `TiledImageSource`_

Creates a new WMTSImageSource instance.


### .capabilities

```js
capabilities: Object | null
```

Parsed WMTS capabilities object


### .layer

```js
layer: string | Object | null
```

The layer to render (identifier string or layer object)


### .tileMatrixSet

```js
tileMatrixSet: string | Object | null
```

The tile matrix set to use (identifier string or object)


### .style

```js
style: string | null
```

The style identifier


### .dimensions

```js
dimensions: Object
```

Dimension values for the WMTS request


### .url

```js
url: string | null
```

The URL template for tile requests


### .constructor

```js
constructor( {
	capabilities = null: Object,
	layer = null: string | Object,
	tileMatrixSet = null: string | Object,
	style = null: string,
	url = null: string,
	dimensions = {}: Object,
} )
```

Creates a new WMTSImageSource instance.

### .getUrl

```js
getUrl( x: number, y: number, level: number ): string
```

Generates the URL for a specific tile.


### .init

```js
init(): Promise<void>
```

Initializes the image source by parsing capabilities and setting up the tiling scheme.

This method:
- Resolves layer, tileMatrixSet, and style from capabilities
- Determines the projection (EPSG:4326 or EPSG:3857)
- Configures the tiling scheme with proper bounds and tile sizes
- Constructs the final URL template


## FeatureInfo


### .label

```js
label: string | null
```

### .propertyTable

```js
propertyTable: string | null
```

### .nullFeatureId

```js
nullFeatureId: number | null
```

### .texture

```js
texture?: Object
```
