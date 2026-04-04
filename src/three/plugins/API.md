<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/three/plugins

## BaseRegion

Abstract base class for `LoadRegionPlugin` regions. Subclass and override
`intersectsTile` to define custom load regions.


### .constructor

```js
constructor(
	{
		errorTarget = 10: number,
		mask = false: boolean,
	}
)
```

## OBBRegion

_extends [`BaseRegion`](#baseregion)_

An oriented bounding-box load region. Only tiles that intersect `obb` are loaded.


### .constructor

```js
constructor(
	{
		obb?: OBB,
		errorTarget = 10: number,
		mask = false: boolean,
	}
)
```

## RayRegion

_extends [`BaseRegion`](#baseregion)_

A ray-based load region. Only tiles that intersect `ray` are loaded.


### .constructor

```js
constructor(
	{
		ray?: Ray,
		errorTarget = 10: number,
		mask = false: boolean,
	}
)
```

## SphereRegion

_extends [`BaseRegion`](#baseregion)_

A spherical load region. Only tiles that intersect `sphere` are loaded.


### .constructor

```js
constructor(
	{
		sphere?: Sphere,
		errorTarget = 10: number,
		mask = false: boolean,
	}
)
```

## BatchedTilesPlugin

Plugin that uses three.js `BatchedMesh` to limit the number of draw calls required and
improve performance. The `BatchedMesh` geometry and instance size are automatically resized
and optimized as new geometry is added and removed. Note that the `renderer` field is
required. Requires Three.js r170 or later.

> [!WARNING]
> All tile geometry rendered with `BatchedMesh` will use the same material and only a single
> material map is supported. Only tile geometry containing a single mesh is supported. Not
> compatible with plugins that modify mesh materials or rely on bespoke mesh data (e.g.
> `TilesFadePlugin`, `DebugTilesPlugin`, GLTF Metadata extensions).

### .constructor

```js
constructor(
	{
		renderer: WebGLRenderer,
		instanceCount = 500: number,
		vertexCount = 1000: number,
		indexCount = 1000: number,
		expandPercent = 0.25: number,
		maxInstanceCount = Infinity: number,
		discardOriginalContent = true: boolean,
		textureSize = null: number | null,
		material = null: Material | null,
	}
)
```

## CesiumIonAuthPlugin

_extends [`CesiumIonAuthPlugin`](../../core/plugins/API.md#cesiumionauthplugin)_

Plugin for authenticating requests to Cesium Ion. Handles token refresh, asset
endpoint resolution, and attribution collection. Auto-registration of terrain and
imagery plugins via `assetTypeHandler` is deprecated — provide a custom handler
instead.


### .constructor

```js
constructor(
	{
		apiToken?: string,
		assetId = null: string | null,
		autoRefreshToken = false: boolean,
		useRecommendedSettings = true: boolean,
		assetTypeHandler?: function,
	}
)
```

## ImageOverlay

Base class for all image overlays. Provides the interface that `ImageOverlayPlugin` uses to
fetch, lock, and release overlay textures.


### .constructor

```js
constructor(
	{
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## GeoJSONOverlay

_extends [`ImageOverlay`](#imageoverlay)_

Overlay that rasterizes a GeoJSON dataset onto 3D tile geometry. Features are drawn using the
Canvas 2D API at the tile's native resolution. Per-feature style overrides can be provided via
the `strokeStyle`, `fillStyle`, `strokeWidth`, and `pointRadius` properties on each GeoJSON
feature's `properties` object.


### .constructor

```js
constructor(
	{
		geojson = null: Object,
		url = null: string,
		resolution = 256: number,
		pointRadius = 6: number,
		strokeStyle = 'white': string,
		strokeWidth = 2: number,
		fillStyle = 'rgba( 255, 255, 255, 0.5 )': string,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## TiledImageOverlay

_extends [`ImageOverlay`](#imageoverlay)_

Base class for overlays backed by a tiled image source (XYZ, TMS, WMS, WMTS, etc.).
Manages a `TiledImageSource` and a `RegionImageSource` that handles compositing
multiple source tiles into a single texture per 3D tile region.


## GoogleMapsOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that streams Google Maps 2D tile imagery on top of 3D tile geometry using the
Google Maps Tile API.


### .constructor

```js
constructor(
	{
		apiToken?: string,
		sessionOptions?: Object,
		autoRefreshToken = false: boolean,
		logoUrl = null: string,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## TMSTilesOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that renders TMS (Tile Map Service) image tiles on top of 3D tile geometry.
See the [TMS specification](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification).


### .constructor

```js
constructor(
	{
		url?: string,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## WMSTilesOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that renders WMS (Web Map Service) image tiles on top of 3D tile geometry.
See the [WMS specification](https://www.ogc.org/standard/wms/).


### .constructor

```js
constructor(
	{
		url?: string,
		layer?: string,
		crs?: string,
		format?: string,
		tileDimension = 256: number,
		styles?: string,
		version?: string,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## WMTSTilesOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that renders WMTS (Web Map Tile Service) image tiles on top of 3D tile geometry.
Pass a parsed capabilities object from `WMTSCapabilitiesLoader` or provide a URL template
directly. See the [WMTS specification](https://www.ogc.org/standard/wmts/).


### .constructor

```js
constructor(
	{
		url?: string,
		layer?: string,
		tileMatrixSet?: string,
		style = 'default': string,
		format = 'image/jpeg': string,
		dimensions = null: Object<string, (string|number)> | null,
		tileMatrixLabels = null: Array<string> | null,
		tileMatrices = null: Array<WMTSTileMatrix> | null,
		projection = null: string | null,
		levels = 20: number,
		tileDimension = 256: number,
		contentBoundingBox = null: Array<number> | null,
	}
)
```

## XYZTilesOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that renders XYZ/Slippy-map image tiles (e.g. OpenStreetMap) on top of 3D tile
geometry. See the [Slippy map tilenames specification](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).


### .constructor

```js
constructor(
	{
		url?: string,
		levels = 20: number,
		tileDimension = 256: number,
		projection = 'EPSG:3857': string,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## CesiumIonOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that streams imagery from a Cesium Ion asset. Supports Ion-hosted TMS assets as well
as external asset types (Google 2D Maps, Bing Maps) that Ion proxies.


### .constructor

```js
constructor(
	{
		apiToken?: string,
		assetId?: number,
		autoRefreshToken = false: boolean,
		opacity = 1: number,
		color = 0xffffff: number | Color,
		frame = null: Matrix4,
		preprocessURL = null: function,
		alphaMask = false: boolean,
		alphaInvert = false: boolean,
	}
)
```

## DebugTilesPlugin

Plugin that adds visual debugging aids to a `TilesRenderer`: bounding-volume
helpers (box, sphere, region), tile color modes based on depth/error/distance/load
order, and an unlit rendering mode. Color modes are available via the static
`ColorModes` property.


### .getDebugColor

```js
getDebugColor: ( val: number, target: Color ) => void
```

Maps a normalized [0, 1] value to a `Color` for debug visualizations. Defaults to
a black-to-white gradient. Replace with a custom function to use a different color
ramp.


### .constructor

```js
constructor(
	{
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
	}
)
```

### .update

```js
update(): void
```

Applies the current plugin field values to all visible tile geometry. Call this
after modifying properties such as `colorMode`, `displayBoxBounds`, or
`displayParentBounds` when `TilesRenderer.update` is not being called every frame
so changes can be reflected.


## ImageFormatPlugin

Base plugin class for tiled image sources with a consistent size and resolution per
tile. Subclasses provide a concrete `imageSource` and override `getUrl` and
`createBoundingVolume` as needed.


### .constructor

```js
constructor(
	{
		imageSource = null: Object,
		center = false: boolean,
		useRecommendedSettings = true: boolean,
	}
)
```

## EllipsoidProjectionTilesPlugin

_extends [`ImageFormatPlugin`](#imageformatplugin)_

Extension of `ImageFormatPlugin` that projects tiled images onto ellipsoidal
(globe-surface) geometry in addition to the default planar layout. Set
`options.shape = 'ellipsoid'` to enable globe projection.


### .constructor

```js
constructor(
	{
		shape = 'planar': string,
		endCaps = true: boolean,
	}
)
```

## TMSTilesPlugin

_extends [`EllipsoidProjectionTilesPlugin`](#ellipsoidprojectiontilesplugin)_

Plugin that renders TMS (Tile Map Service) image tiles projected onto 3D tile geometry.
See the [TMS specification](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification).

> [!NOTE]
> Most TMS generation implementations (including CesiumJS and Ion) do not correctly support the Origin tag and tile index offsets.

### .constructor

```js
constructor(
	{
		url?: string,
	}
)
```

## WMSTilesPlugin

_extends [`EllipsoidProjectionTilesPlugin`](#ellipsoidprojectiontilesplugin)_

Plugin that renders WMS (Web Map Service) image tiles projected onto 3D tile geometry.


### .constructor

```js
constructor(
	{
		url?: string,
		layer?: string,
		crs?: string,
		format?: string,
		tileDimension?: number,
		styles?: string,
		version?: string,
	}
)
```

## WMTSTilesPlugin

_extends [`EllipsoidProjectionTilesPlugin`](#ellipsoidprojectiontilesplugin)_

Plugin that renders WMTS (Web Map Tile Service) image tiles projected onto 3D tile
geometry. Pass a parsed capabilities object from `WMTSCapabilitiesLoader` or provide
a URL template directly.


### .constructor

```js
constructor(
	{
		url?: string,
		layer?: string,
		tileMatrixSet?: string,
		style = 'default': string,
		format = 'image/jpeg': string,
		dimensions = null: Object<string, (string|number)> | null,
		tileMatrixLabels = null: Array<string> | null,
		tileMatrices = null: Array<WMTSTileMatrix> | null,
		projection = null: string | null,
		levels = 20: number,
		tileDimension = 256: number,
		contentBoundingBox = null: Array<number> | null,
	}
)
```

## XYZTilesPlugin

_extends [`EllipsoidProjectionTilesPlugin`](#ellipsoidprojectiontilesplugin)_

Plugin that renders XYZ/Slippy-map image tiles (e.g. OpenStreetMap) projected onto
3D tile geometry. See the [Slippy map tilenames specification](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).


### .constructor

```js
constructor(
	{
		url?: string,
		levels?: number,
		tileDimension?: number,
		projection?: string,
	}
)
```

## DeepZoomImagePlugin

_extends [`ImageFormatPlugin`](#imageformatplugin)_

Plugin that renders a Deep Zoom Image (DZI) as a 3D Tiles-compatible tiled texture.


### .constructor

```js
constructor(
	{
		url?: string,
		center = false: boolean,
		useRecommendedSettings = true: boolean,
	}
)
```

## GLTFCesiumRTCExtension

GLTF loader plugin that applies the [CESIUM_RTC](https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Vendor/CESIUM_RTC/README.md)
extension, which offsets the scene position by the RTC center defined in the GLTF
JSON. Register with a `GLTFLoader` via
`loader.register( () => new GLTFCesiumRTCExtension() )`.


## GLTFExtensionsPlugin

Plugin for automatically adding common extensions and loaders for 3D Tiles to the
`GLTFLoader` used for parsing tile geometry. A `DRACOLoader` can be provided to
support loading Draco-compressed point cloud files.


### .constructor

```js
constructor(
	{
		metadata = true: boolean,
		rtc = true: boolean,
		plugins = []: Array,
		dracoLoader = null: Object,
		ktxLoader = null: Object,
		meshoptDecoder = null: Object,
		autoDispose = true: boolean,
	}
)
```

## GLTFMeshFeaturesExtension

GLTF loader plugin that parses the [EXT_mesh_features](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features)
extension and attaches a `MeshFeatures` instance to `mesh.userData.meshFeatures` on
each primitive. Register with a `GLTFLoader` via
`loader.register( () => new GLTFMeshFeaturesExtension() )`.


### .constructor

```js
constructor( parser: Object )
```

## GLTFStructuralMetadataExtension

GLTF loader plugin that parses the [EXT_structural_metadata](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata)
extension and attaches a `StructuralMetadata` instance to `scene.userData.structuralMetadata`
(and to each primitive mesh). Register with a `GLTFLoader` via
`loader.register( () => new GLTFStructuralMetadataExtension() )`.

> [!NOTE]
> 64-bit integer types are not fully supported.

### .constructor

```js
constructor( parser: Object )
```

## ImageOverlayPlugin

Plugin that composites one or more tiled image overlays onto 3D tile geometry by
generating per-tile textures from image sources (XYZ, TMS, WMTS, WMS, GeoJSON, etc.).
Image sources are added via `addOverlay()` and removed via `deleteOverlay()`.


### .constructor

```js
constructor(
	{
		renderer: WebGLRenderer,
		overlays = []: Array,
		resolution = 256: number,
		enableTileSplitting = true: boolean,
	}
)
```

### .addOverlay

```js
addOverlay( overlay: ImageOverlay, order = null: number | null ): void
```

Adds an image overlay source to the plugin. The `order` parameter controls the draw
order among overlays; lower values are drawn first. If omitted, the overlay is appended
after all existing overlays.


### .setOverlayOrder

```js
setOverlayOrder( overlay: ImageOverlay, order: number ): void
```

Updates the draw order for the given overlay.


### .deleteOverlay

```js
deleteOverlay( overlay: ImageOverlay ): void
```

Removes the given overlay from the plugin.


## LoadRegionPlugin

Plugin that restricts tile loading and traversal to one or more geometric regions
(`SphereRegion`, `RayRegion`, `OBBRegion`). Only tiles that intersect an active
region are loaded and refined. Regions marked as masks additionally prevent tiles
outside them from loading.


## MeshFeatures

Provides access to `EXT_mesh_features` feature ID data for a single mesh primitive.
Instances are created by `GLTFMeshFeaturesExtension` and attached to
`mesh.userData.meshFeatures`. Use `getFeatures()` or `getFeaturesAsync()` to read
feature IDs at a point on the mesh surface.


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


## QuantizedMeshPlugin

Plugin that adds support for the Cesium quantized-mesh terrain format. Fetches the
`layer.json` descriptor from the tileset root and dynamically generates 3D Tiles
tile content from quantized-mesh buffers.


### .constructor

```js
constructor(
	{
		useRecommendedSettings = true: boolean,
		skirtLength = null: number | null,
		smoothSkirtNormals = true: boolean,
		generateNormals = true: boolean,
		solid = false: boolean,
	}
)
```

## ReorientationPlugin

Plugin for automatically re-orienting and re-centering the tileset to make it visible
near the origin and facing the right direction. If `lat`/`lon` are provided the
tileset is placed at that geographic location; otherwise the plugin tries to determine
if the tileset is on the globe surface and estimates the coordinates. If no coordinates
can be determined the tileset is oriented so the given `up` axis aligns to three.js' +Y.


### .constructor

```js
constructor(
	{
		lat = null: number | null,
		lon = null: number | null,
		height = 0: number,
		up = '+z': string,
		recenter = true: boolean,
		azimuth = 0: number,
		elevation = 0: number,
		roll = 0: number,
	}
)
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


## StructuralMetadata

Provides access to `EXT_structural_metadata` property tables, property textures, and
property attributes for a GLTF scene or primitive. Instances are created by
`GLTFStructuralMetadataExtension` and attached to `scene.userData.structuralMetadata`
and `mesh.userData.structuralMetadata`.


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
async getPropertyTextureDataAsync(
	triangle: number,
	barycoord: Vector3,
	target = []: Array
): Array
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

Plugin that processes tile geometry buffer attributes into smaller data types on load
and disables texture mipmaps to save memory. Can reduce geometry memory footprint by
more than half and texture memory by around a third. Note that the default attribute
size when compression is enabled is fairly aggressive and may cause visual artifacts.


### .constructor

```js
constructor(
	{
		generateNormals = false: boolean,
		disableMipmaps = true: boolean,
		compressIndex = true: boolean,
		compressNormals = false: boolean,
		compressUvs = false: boolean,
		compressPosition = false: boolean,
		uvType = Int8Array: TypedArrayConstructor,
		normalType = Int8Array: TypedArrayConstructor,
		positionType = Int16Array: TypedArrayConstructor,
	}
)
```

## TileFlatteningPlugin

Plugin that flattens tile geometry vertices onto the surface of one or more mesh
"shapes", useful for placing flat terrain overlays or cutting roads into terrain.
Shapes are added via `addShape()` and removed via `deleteShape()` or `clearShapes()`.


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
	{
		threshold = Infinity: number,
	}
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

Plugin that overrides material shaders to fade tile geometry in and out as tile LODs
change, preventing pop-in. Dispatches `fade-change`, `fade-start`, and `fade-end`
events on the `TilesRenderer` during animation — use these when doing on-demand
rendering. Works alongside `BatchedTilesPlugin` when present.


### .constructor

```js
constructor(
	{
		fadeDuration = 250: number,
		maximumFadeOutTiles = 50: number,
		fadeRootTiles = false: boolean,
	}
)
```

## UnloadTilesPlugin

Plugin that unloads geometry, textures, and materials of any given tile when its
visibility changes to non-visible, freeing GPU memory. The model data still exists on
the CPU until it is completely removed from the cache, allowing it to be re-uploaded
without re-fetching.


### .estimatedGpuBytes

```js
estimatedGpuBytes: number
```

The number of bytes currently uploaded to the GPU for rendering. Compare to
`lruCache.cachedBytes` which reports all downloaded bytes including those not
yet on the GPU.


### .constructor

```js
constructor(
	{
		delay = 0: number,
		bytesTarget = 0: number,
	}
)
```

## UpdateOnChangePlugin

Plugin that skips `TilesRenderer.update()` calls when nothing has changed — no camera
movement, no new tiles loaded, and no explicit `needsUpdate` flag set. Useful for
event-driven renderers that only render on demand.


## WMSCapabilitiesLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_

Loader that fetches and parses a WMS `GetCapabilities` XML document into a structured
JavaScript object. The result can be passed to `WMSTilesPlugin`.

The parsed result has the shape:
```
{
  version: string,
  service: { name, title, abstract, keywords, maxWidth, maxHeight, layerLimit },
  layers: [ { name, title, abstract, queryable, opaque, keywords, crs,
              boundingBoxes, contentBoundingBox, styles, subLayers } ],
  request: { [operationName]: { formats, dcp, href } },
}
```
`contentBoundingBox` and `boundingBoxes[].bounds` are `[ minLon, minLat, maxLon, maxLat ]`
in radians.


### .constructor

```js
constructor( manager: LoadingManager )
```

## WMTSCapabilitiesLoader

_extends [`LoaderBase`](../../core/renderer/API.md#loaderbase)_

Loader that fetches and parses a WMTS `GetCapabilities` XML document into a structured
JavaScript object. The result can be passed directly to `WMTSTilesPlugin`.

The parsed result has the shape:
```
{
  serviceIdentification: { title, abstract, serviceType, serviceTypeVersion },
  tileMatrixSets: [ { identifier, title, abstract, supportedCRS, tileMatrices } ],
  layers: [ { title, identifier, format, boundingBox, dimensions, styles,
              resourceUrls, tileMatrixSetLinks, tileMatrixSets } ],
}
```
Bounding box `bounds` arrays are in `[ minLon, minLat, maxLon, maxLat ]` order in radians.


### .constructor

```js
constructor( manager: LoadingManager )
```

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

## WMTSTileMatrix


### .identifier

```js
identifier: string
```

TileMatrix identifier (e.g., 'Level0', 'EPSG:3857:0').

### .matrixWidth

```js
matrixWidth: number
```

Number of tile columns at this level.

### .matrixHeight

```js
matrixHeight: number
```

Number of tile rows at this level.

### .tileWidth

```js
tileWidth?: number
```

Tile width in pixels (defaults to tileDimension).

### .tileHeight

```js
tileHeight?: number
```

Tile height in pixels (defaults to tileDimension).

### .tileBounds

```js
tileBounds: Array<number>
```

Tile grid bounds in radians `[west, south, east, north]`.
  Required because the actual coverage depends on TopLeftCorner and ScaleDenominator
  from the capabilities XML and cannot be computed from grid dimensions alone.
