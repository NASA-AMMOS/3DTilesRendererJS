<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/three/plugins

## BaseRegion

Abstract base class for `LoadRegionPlugin` regions. Subclass and override
`intersectsTile` to define custom load regions.


### .constructor

```js
constructor(
	{
		// Geometric error target used when this region controls
		// refinement.
		errorTarget = 10: number,

		// When `true`, tiles outside this region are suppressed (mask
		// mode).
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
		// The oriented bounding box; defaults to an empty OBB at the
		// origin.
		obb?: OBB,

		// Geometric error target for tiles inside the region.
		errorTarget = 10: number,

		// Mask mode — suppresses tiles outside this region.
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
		// The ray; defaults to a ray at the origin pointing in +Z.
		ray?: Ray,

		// Geometric error target for tiles inside the region.
		errorTarget = 10: number,

		// Mask mode — suppresses tiles outside this region.
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
		// The sphere volume; defaults to an empty sphere at the
		// origin.
		sphere?: Sphere,

		// Geometric error target for tiles inside the region.
		errorTarget = 10: number,

		// Mask mode — suppresses tiles outside this region.
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
		// The renderer used to generate a `WebGLArrayRenderTarget`.
		renderer: WebGLRenderer,

		// Initial number of instances in the batched mesh.
		instanceCount = 500: number,

		// Minimum vertex space to reserve per tile geometry added.
		vertexCount = 1000: number,

		// Minimum index space to reserve per tile geometry added.
		indexCount = 1000: number,

		// Fraction by which to grow the mesh when capacity is
		// exceeded.
		expandPercent = 0.25: number,

		// Hard cap on instance count (clamped to GPU limits).
		maxInstanceCount = Infinity: number,

		// Free the original tile scene after batching. Set to `false`
		// when used with `UnloadTilesPlugin`.
		discardOriginalContent = true: boolean,

		// Override width/height for the texture array; defaults to the
		// first tile's texture size.
		textureSize = null: number | null,

		// Custom material for the batched mesh; defaults to the first
		// tile's material type.
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
		// Cesium Ion API token.
		apiToken?: string,

		// Cesium Ion asset ID, or `null` when using an explicit root
		// URL.
		assetId = null: string | null,

		// Automatically refresh the token on 4xx errors.
		autoRefreshToken = false: boolean,

		// Apply recommended renderer settings for Cesium Ion assets.
		useRecommendedSettings = true: boolean,

		// Callback `(type, tiles, asset)` invoked for non-3DTILES
		// asset types.
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
		// Opacity of the overlay layer (0–1).
		opacity = 1: number,

		// Tint color multiplied with the overlay texture.
		color = 0xffffff: number | Color,

		// World-space transform defining the plane for planar
		// projection. If null, cartographic (lat/lon) projection is
		// used instead.
		frame = null: Matrix4,

		// Optional function `(url) => url` called before every fetch
		// to allow URL rewriting or token injection.
		preprocessURL = null: function,

		// If true, the overlay alpha channel masks the underlying tile
		// surface rather than blending on top of it.
		alphaMask = false: boolean,

		// If true, inverts the alpha channel before applying the mask
		// or blend.
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
		// GeoJSON FeatureCollection or Feature object to render. If
		// not provided, `url` must be set so the data can be fetched
		// on init.
		geojson = null: Object,

		// URL to a GeoJSON file to fetch on initialization (used when
		// `geojson` is not supplied directly).
		url = null: string,

		// Canvas resolution (pixels) used when compositing tiles.
		resolution = 256: number,

		// Per-feature style callback. When provided, overrides
		// `strokeStyle`, `fillStyle`, `strokeWidth`, and
		// `pointRadius`.
		getStyle?: (
			feature: Object,
			properties: Object
		) => VectorTileStyle | null,

		// Radius in pixels used to render Point features.
		pointRadius = 6: number,

		// Canvas stroke style for feature outlines.
		strokeStyle = 'white': string,

		// Stroke line width in pixels.
		strokeWidth = 2: number,

		// Canvas fill style for feature interiors.
		fillStyle = 'rgba( 255, 255, 255, 0.5 )': string,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
		alphaInvert = false: boolean,
	}
)
```

## MVTOverlay

_extends [`ImageOverlay`](#imageoverlay)_

Overlay that renders XYZ-template MVT vector tiles on top of 3D tile geometry.
See the [Mapbox Vector Tile specification](https://github.com/mapbox/vector-tile-spec).

Requires the optional peer dependencies `@mapbox/vector-tile` and `pbf`, which are
imported dynamically on first use and must be installed separately:
```
npm install @mapbox/vector-tile pbf
```


### .constructor

```js
constructor(
	{
		// URL template with `{x}`, `{y}`, `{z}` placeholders.
		url?: string,

		// Number of zoom levels.
		levels = 20: number,

		// Projection scheme identifier.
		projection = 'EPSG:3857': string,

		// Canvas resolution for generated tile textures.
		resolution = 512: number,

		// Per-feature style callback.
		getStyle?: (
			layerName: string,
			properties: Object | null
		) => VectorTileStyle | null,
	}
)
```

## PMTilesOverlay

_extends [`MVTOverlay`](#mvtoverlay)_

Overlay that renders PMTiles vector or raster data on top of 3D tile geometry.
Projection and zoom levels are read automatically from the PMTiles archive header.

Requires the optional peer dependency `pmtiles`, which is imported dynamically on first use
and must be installed separately. Vector archives additionally require `@mapbox/vector-tile`
and `pbf`:
```
npm install pmtiles @mapbox/vector-tile pbf
```


### .constructor

```js
constructor(
	{
		// URL to the `.pmtiles` archive.
		url?: string,

		// Canvas resolution for generated tile textures.
		resolution = 512: number,

		// Per-feature style callback. Only applies to vector archives.
		getStyle?: (
			layerName: string,
			properties: Object | null
		) => VectorTileStyle | null,
	}
)
```

## TiledImageOverlay

_extends [`ImageOverlay`](#imageoverlay)_

Base class for overlays backed by a tiled image source (XYZ, TMS, WMS, WMTS, etc.).
Manages a `TiledImageSource` and a `RegionImageSource` that handles compositing
multiple source tiles into a single texture per 3D tile region.


## DeepZoomOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Plugin that renders a Deep Zoom Image (DZI) as a tiled overlay. Only a single embedded "Image" is supported.
See the [Deep Zoom specification](https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95))
and [OpenSeadragon](https://openseadragon.github.io).


### .constructor

```js
constructor(
	{
		// URL to the `.dzi` descriptor file.
		url?: string,
	}
)
```

## GoogleMapsOverlay

_extends [`TiledImageOverlay`](#tiledimageoverlay)_

Overlay that streams Google Maps 2D tile imagery on top of 3D tile geometry using the
Google Maps Tile API.


### .constructor

```js
constructor(
	{
		// Google Maps API key.
		apiToken?: string,

		// Session creation options passed to the Google Maps Tile API
		// when establishing a tile session.
		sessionOptions?: Object,

		// Automatically refresh the session token before it expires.
		autoRefreshToken = false: boolean,

		// URL to a Google logo image. If provided, it is included in
		// the overlay attributions as required by Google's terms of
		// service.
		logoUrl = null: string,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
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
		// URL to the TMS `tilemapresource.xml` descriptor or tile
		// template.
		url?: string,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
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
		// WMS base URL.
		url?: string,

		// WMS layer name.
		layer?: string,

		// Coordinate reference system, e.g. `'EPSG:4326'`.
		crs?: string,

		// Image MIME type, e.g. `'image/png'`.
		format?: string,

		// Tile pixel size.
		tileDimension = 256: number,

		// WMS styles parameter.
		styles?: string,

		// WMS version string.
		version = '1.3.0': string,

		// Whether to request a transparent image.
		transparent = false: boolean,

		// Number of zoom levels.
		levels = 18: number,

		// Content bounding box in radians `[west, south, east,
		// north]`. If null, uses full projection bounds.
		contentBoundingBox = null: Array<number> | null,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
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
		// WMTS service URL.
		url?: string,

		// WMTS layer identifier.
		layer?: string,

		// TileMatrixSet identifier (e.g., 'GoogleMapsCompatible',
		// 'EPSG:3857').
		tileMatrixSet?: string,

		// Style identifier.
		style = 'default': string,

		// Output image format (e.g., 'image/png', 'image/jpeg').
		format = 'image/jpeg': string,

		// WMTS dimension values
		dimensions = null: Object<string, (string|number)> | null,

		// Custom TileMatrix identifiers per level
		tileMatrixLabels = null: Array<string> | null,

		// Explicit per-level tile matrix definitions. When provided,
		// `levels` and `tileMatrixLabels` are ignored.
		tileMatrices = null: Array<WMTSTileMatrix> | null,

		// Projection identifier ('EPSG:3857' or 'EPSG:4326'). Defaults
		// to 'EPSG:3857' if not specified.
		projection = null: string | null,

		// Number of zoom levels. Ignored if `tileMatrices` is
		// provided.
		levels = 20: number,

		// Default tile width and height in pixels.
		tileDimension = 256: number,

		// Content bounding box in radians, `[west, south, east,
		// north]`. If null, uses full projection bounds.
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
		// URL template with `{x}`, `{y}`, `{z}` placeholders.
		url?: string,

		// Number of zoom levels.
		levels = 20: number,

		// Tile pixel size.
		tileDimension = 256: number,

		// Projection scheme identifier.
		projection = 'EPSG:3857': string,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
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
		// Cesium Ion API token for authentication.
		apiToken?: string,

		// Cesium Ion asset ID.
		assetId?: number,

		// Automatically refresh the auth token before it expires.
		autoRefreshToken = false: boolean,

		// Overlay opacity (0–1).
		opacity = 1: number,

		// Tint color.
		color = 0xffffff: number | Color,

		// Planar projection frame. If null, cartographic projection is
		// used.
		frame = null: Matrix4,

		// URL rewriting callback.
		preprocessURL = null: function,

		// Use alpha channel as a surface mask.
		alphaMask = false: boolean,

		// Invert the alpha channel.
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
getDebugColor: ( val: number, target: Color ) => void = ( value, target ) => target.setRGB( value, value, value )
```

Maps a normalized [0, 1] value to a `Color` for debug visualizations. Defaults to
a black-to-white gradient. Replace with a custom function to use a different color
ramp.


### .constructor

```js
constructor(
	{
		// Show OBB bounding-box helpers.
		displayBoxBounds = false: boolean,

		// Show bounding-sphere helpers.
		displaySphereBounds = false: boolean,

		// Show bounding-region helpers.
		displayRegionBounds = false: boolean,

		// Also show ancestor bounding volumes for visible tiles.
		displayParentBounds = false: boolean,

		// Initial tile color mode.
		colorMode = ColorModes.NONE: number,

		// Color mode applied to bounding-volume helpers.
		boundsColorMode = ColorModes.NONE: number,

		// Maximum tree depth for depth-based coloring (`-1` = auto).
		maxDebugDepth = -1: number,

		// Maximum distance for distance-based coloring (`-1` = auto).
		maxDebugDistance = -1: number,

		// Maximum error for error-based coloring (`-1` = auto).
		maxDebugError = -1: number,

		// Callback `( tile, mesh )` used when `colorMode` is
		// `CUSTOM_COLOR`.
		customColorCallback = null: function | null,

		// Replace tile materials with unlit `MeshBasicMaterial`.
		unlit = false: boolean,

		// Whether the plugin is active on init.
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


## GeneratedSurfacePlugin

Plugin that generates tiled surface geometry from a tiling scheme, optionally loading
image overlay data.

The tiling scheme and projection are derived from a provided overlay.
If the source's projection is cartographic (any EPSG scheme), the plugin supports
both planar and ellipsoidal geometry via the `shape` option.


### .constructor

```js
constructor(
	{
		// Overlay instance to derive the tiling scheme from. When
		// `applyOverlayTexture` is enabled, also used to texture the
		// generated tile meshes.
		overlay = null: ImageOverlay,

		// Geometry shape: `'planar'` or `'ellipsoid'`. Only  
		// meaningful for cartographic sources.
		shape = 'ellipsoid': string,

		// For Mercator ellipsoid mode, snap poles to ±90° lat.
		endCaps = true: boolean,

		// Shift planar tiles so the image is centered at origin.
		center = true: boolean,

		// Apply recommended TilesRenderer settings.
		useRecommendedSettings = true: boolean,

		// Whether to apply the overlay's texture to the generated tile
		// meshes.
		applyOverlayTexture = false: boolean,
	}
)
```

### .getCartographicFromPosition

```js
getCartographicFromPosition( position: Vector3, target = {}: Object ): Object
```

Returns the cartographic coordinates for a given world-space position. "lat" and "lon" are assigned
to the target object.


### .getPositionFromCartographic

```js
getPositionFromCartographic(
	lat: number,
	lon: number,
	target = new Vector3(): Vector3
): Vector3
```

Returns the world-space position for a given cartographic coordinate.


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
		// Enable the `EXT_structural_metadata` and `EXT_mesh_features`
		// extensions.
		metadata = true: boolean,

		// Enable the `CESIUM_RTC` extension.
		rtc = true: boolean,

		// Additional GLTF loader plugins to pass to
		// `GLTFLoader.register`.
		plugins = []: Array,

		// A `DRACOLoader` instance for Draco-compressed geometry.
		dracoLoader = null: Object,

		// A `KTX2Loader` instance for KTX2-compressed textures.
		ktxLoader = null: Object,

		// A `MeshoptDecoder` for Meshopt-compressed meshes.
		meshoptDecoder = null: Object,

		// Automatically dispose the DRACO and KTX loaders on
		// `dispose()`.
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
		// The renderer used for constructing and rendering to render
		// targets.
		renderer: WebGLRenderer,

		// Initial image overlay sources to add.
		overlays = []: Array,

		// Resolution of each generated tile texture in pixels.
		resolution = 256: number,

		// Allow tiles to be split to match image tile boundaries.
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


### .resetFailedOverlays

```js
resetFailedOverlays(): void
```

Retries any overlay texture fetches that previously failed. Successfully loaded textures
are applied to their tiles without requiring a geometry reload. Pairs with the `load-error`
event, which fires on the `TilesRenderer` when an overlay texture fetch fails.


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
		// Apply recommended error and fetch settings for terrain.
		useRecommendedSettings = true: boolean,

		// Override skirt length in metres; defaults to tile geometric
		// error.
		skirtLength = null: number | null,

		// Blend skirt normals with tile surface for smoother edges.
		smoothSkirtNormals = true: boolean,

		// Compute vertex normals for the terrain mesh.
		generateNormals = true: boolean,

		// Generate a solid closed mesh (adds a bottom cap).
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
		// Latitude in radians of the surface point to orient to
		// (requires `lon`).
		lat = null: number | null,

		// Longitude in radians of the surface point to orient to
		// (requires `lat`).
		lon = null: number | null,

		// Height in metres above the ellipsoid surface.
		height = 0: number,

		// Axis to orient toward three.js +Y when no lat/lon is
		// available. Valid values are `±x`, `±y`, `±z`.
		up = '+z': string,

		// Whether to reposition the tileset to the origin.
		recenter = true: boolean,

		// Azimuth rotation in radians.
		azimuth = 0: number,

		// Elevation rotation in radians.
		elevation = 0: number,

		// Roll rotation in radians.
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
		// Generate vertex normals if absent.
		generateNormals = false: boolean,

		// Disable mipmap generation on tile textures.
		disableMipmaps = true: boolean,

		// Compress index buffers to the smallest fitting integer type.
		compressIndex = true: boolean,

		// Compress normal attributes.
		compressNormals = false: boolean,

		// Compress UV attributes.
		compressUvs = false: boolean,

		// Compress position attributes.
		compressPosition = false: boolean,

		// Target type for UV compression.
		uvType = Int8Array: TypedArrayConstructor,

		// Target type for normal compression.
		normalType = Int8Array: TypedArrayConstructor,

		// Target type for position compression.
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
		// Maximum distance from the shape surface within which
		// vertices are flattened. `Infinity` always flattens; `0`
		// never flattens.
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
		// Time in milliseconds for a tile to fully fade in or out.
		fadeDuration = 250: number,

		// Maximum simultaneous fade-out tiles. If exceeded, tiles pop
		// instead of fading.
		maximumFadeOutTiles = 50: number,

		// Whether root-level tiles fade in on their first appearance.
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
		// Milliseconds to wait after a tile is hidden before freeing
		// its GPU data. Useful to avoid thrashing when the camera is
		// moving.
		delay = 0: number,

		// Target GPU byte budget to unload down to. `0` means unload
		// with no budget limit.
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
JavaScript object. The result can be used to configure `WMSImageSource`.

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
JavaScript object. The result can be used to configure `WMTSImageSource`.

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

## VectorTileStyle


### .fill

```js
fill = '#cccccc': string
```

CSS fill color.

### .stroke

```js
stroke = 'transparent': string
```

CSS stroke color.

### .strokeWidth

```js
strokeWidth = 1: number
```

Stroke width in pixels.

### .radius

```js
radius = 2: number
```

Point radius in pixels.

### .order

```js
order = 0: number
```

Layer draw order; lower values are drawn first.

### .visible

```js
visible = true: boolean
```

Whether the feature is rendered.

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
