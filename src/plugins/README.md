Documentation for plugins and extensions provided by the `3d-tiles-renderer/plugins` export.

# GLTF Plugins

Set of three.js GLTFLoader plugins to be registered via `GLTFLoader.register`. To use with the TilesRenderer:

```js
const tiles = new TilesRenderer( url );
const loader = new GLTFLoader( tiles.manager );
loader.register( () => new GLTFMeshFeaturesExtension() );
loader.register( () => new GLTFStructuralMetadataExtension() );
loader.register( () => new GLTFCesiumRTCExtension() );
tiles.manager.addHandler( /(gltf|glb)$/g, loader );
```

## GLTFMeshFeaturesExtension

Plugin that adds support for the [EXT_mesh_features](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features) extension.
Adds a `Object3D.userData.meshFeatures` to each object with the extension that provides the following API:

### .getTextures

```js
getTextures() : Array<Texture>
```

Returns an indexed list of all textures used by features in the extension.

### .getFeatureInfo

```js
getFeatureInfo() : {
	label: string | null,
	propertyTable: string | null,
	nullFeatureId: number | null,
	texture?: {
		texCoord: number,
		channels: Array<number>,
	}
}
```

Returns the feature information information associated with all features on the object.

### .getFeatures

```js
getFeatures( triangle : number, barycoord : Vector3 ) : Array<number>
```

Takes the triangle index from something like a raycast hit as well as the calculated barycentric coordinate and returns the list of feature ids extracted from
the object at the given point. Indexed in the same order as the list of feature info in the extension.

```js
const barycoord = new Vector3();
const triangle = new Triangle();
const hit = raycaster.raycast( object );
if ( hit ) {

	const { face, point, faceIndex } = hit;
	triangle.setFromAttributeAndIndices( object.geometry.attributes.position, face.a, face.b, face.c );
	triangle.a.applyMatrix4( object.matrixWorld );
	triangle.b.applyMatrix4( object.matrixWorld );
	triangle.c.applyMatrix4( object.matrixWorld );
	triangle.getBarycoord( point, barycoord );

	const features = meshFeatures.getFeatures( faceIndex, barycoord );
	// ...

}
```

### .getFeaturesAsync

```js
getFeaturesAsync( triangle : number, barycoord : Vector3 ) : Promise<Array<number>>
```

Performs the same function as `getFeatures` but with the texture asynchronous texture read operation.

## GLTFStructuralMetadataExtension

Plugin that adds support for the [EXT_structural_metadata](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata) extension. Adds a `Object3D.userData.structuralMetadata` to each object with the extension that provides the following API.

_Note that 64 bit integer types are not fully supported._

### .textures

```js
textures: Array<Texture>
```

Returns an indexed list of all textures used by metadata accessors in the extension.

### .schema

```js
schema: Object
```

The extension schema object.

### .getPropertyTableData

```js
getPropertyTableData(
	tableIndices : Array<number>,
	ids : Array<number>,
	target = [] : Array,
) : target
```

Returns data stored in property tables. Takes a list of table ids and ids from those tables, and returns a list of objects adhering to the structure class referenced in the table schema.

### .getPropertyTableInfo

```js
getPropertyTableInfo( tableIndices = null : Array<number> ) : Array<{
	name: string,
	className: string,
}>
```

Returns information about the tables.

### .getPropertyTextureData

```js
getPropertyTextureData(
	triangle : number,
	barycoord : Vector3,
	target = [] : Array,
) : target
```

Returns data stored in property textures. Takes a triangle index and barycentric coordinate, and returns a list of objects adhering to the structure class referenced in the table schema. See `MeshFeatures.getFeatures` for how to calculate the index and barycoord.

### .getPropertyTextureDataAsync

```js
getPropertyTextureDataAsync(
	triangle : number,
	barycoord : Vector3,
	target = [] : Array,
) : Promise<target>
```

Returns the same data from `getPropertyTextureData` but performs texture read operations asynchronously.

### .getPropertyTextureInfo

```js
getPropertyTextureInfo() : Array<{
	name: string,
	className: string,
	properties: {
		[name]: {
			channels: Array<number>,
			index: number | null,
			texCoord: number | null,
		},
	},
}>
```

Returns information about the property texture accessors from the extension.

### .getPropertyAttributeData

```js
getPropertyAttributeData( attributeIndex : number, target = [] : Array) : target
```

Returns data stored as property attributes. Takes the index of an index from length of the attributes, and returns a list of objects adhering to the structure class referenced in the table schema.

### .getPropertyAttributeInfo

```js
getPropertyAttributeInfo() : Array<{
	name: string,
	className: string,
}>
```

Returns information about the attribute accessors from the extension.

## GLTFCesiumRTCExtension

Plugin that adds support for [CESIUM_RTC](https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Vendor/CESIUM_RTC/README.md) extension.

# TilesRenderer Plugins

Plugins to register to the TilesRenderer instance to modify behavior.

```js
const tiles = new TilesRenderer( url );
tiles.registerPlugin( new TileCompressionPlugin() );
tiles.registerPlugin( new TilesFadePlugin() );
```

## ImplicitTilingPlugin

Plugin that adds support for 3d tiles [implicit tiling](https://github.com/CesiumGS/3d-tiles/tree/main/specification/ImplicitTiling) feature.

## DebugTilesPlugin

Plugin TilesRenderer that includes helpers for debugging and visualizing the various tiles in the tile set. Material overrides will not work as expected with this plugin. The plugin includes additional logic and initialization code which can cause performance loss so it's recommended to only use this when needed.

### .enabled

```js
enabled = true : boolean
```

If true then the debug logic is enabled, which can affect performance. It's recommended to disable or remove the plugin when not in use.

### .colorMode

```js
colorMode = NONE : ColorMode
```

Which color mode to use when rendering the tile set. The following exported enumerations can be used:

```js
// No special color mode. Uses the default materials.
NONE

// Render the screenspace error from black to white with errorTarget
// being the maximum value.
SCREEN_ERROR

// Render the geometric error from black to white with maxDebugError
// being the maximum value.
GEOMETRIC_ERROR

// Render the distance from the camera to the tile as black to white
// with maxDebugDistance being the maximum value.
DISTANCE

// Render the depth of the tile relative to the root as black to white
// with maxDebugDepth being the maximum value.
DEPTH

// Render the depth of the tile relative to the nearest rendered parent
// as black to white with maxDebugDepth being the maximum value.
RELATIVE_DEPTH

// Render leaf nodes as white and parent nodes as black.
IS_LEAF

// Render the tiles with a random color to show tile edges clearly.
RANDOM_COLOR

// Render every individual mesh in the scene with a random color.
RANDOM_NODE_COLOR

// Sets a custom color using the customColorCallback call back.
CUSTOM_COLOR
```

### .customColorCallback

```js
customColorCallback: (tile: Tile, child: Object3D) => void
```

The callback used if `debugColor` is set to `CUSTOM_COLOR`. Value defaults to `null` and must be set explicitly.

### .displayBoxBounds

```js
displayBoxBounds = false : boolean
```

Display wireframe bounding boxes from the tiles `boundingVolume.box` (or derived from the region bounds) for every visible tile.

### .displaySphereBounds

```js
displaySphereBounds = false : boolean
```

Display wireframe bounding boxes from the tiles `boundingVolume.sphere` (or derived from the bounding box / region bounds) for every visible tile.

### .displayRegionBounds

```js
displayRegionBounds = false : boolean
```

Display wireframe bounding rgions from the tiles `boundingVolume.region` for every visible tile if it exists.

### .displayParentBounds

```js
displayParentBounds = false : boolean
```

If true then all the parent bounds of the current leaf tiles will be displayed.

### .maxDebugDepth

```js
maxDebugDepth = - 1 : Number
```

The depth value that represents white when rendering with `DEPTH` or `RELATIVE_DEPTH` [colorMode](#colorMode). If `maxDebugDepth` is `-1` then the maximum depth of the tile set is used.

### .maxDebugError

```js
maxDebugError = - 1 : Number
```

The error value that represents white when rendering with `GEOMETRIC_ERROR` [colorMode](#colorMode). If `maxDebugError` is `-1` then the maximum geometric error in the tile set is used.

### .maxDebugDistance

```js
maxDebugDistance = - 1 : Number
```

The distance value that represents white when rendering with `DISTANCE` [colorMode](#colorMode). If `maxDebugDistance` is `-1` then the radius of the tile set is used.

### .constructor

```js
constructor( options = {} )
```

Takes a set of options to initialize to.

### .getDebugColor

```js
getDebugColor : ( val : Number, target : Color ) => void
```

The function used to map a [0, 1] value to a color for debug visualizations. By default the color is mapped from black to white.

## GoogleCloudAuthPlugin

### constructor

```js
constructor( { accessToken : String, autoRefreshToken = false : Boolean, logoUrl = null : String | null, useRecommendedSettings = true : Boolean } )
```

Takes the Google Cloud access token. If `autoRefreshToken` is set to true then the plugin will automatically perform a new root tile request once the existing token has expired after four hours.
This plugin changes below values to be more efficient for the photorealistic tiles if `useRecommendedSettings = true (default)`:
```js
tiles.parseQueue.maxJobs = 10;
tiles.downloadQueue.maxJobs = 30;
tiles.errorTarget = 40;
```

## CesiumIonAuthPlugin

### constructor

```js
constructor( { apiToken : String, assetId = null : String | null, autoRefreshToken = false : Boolean } )
```

Takes the CesiumIon access token and optionally the asset id. If the asset id is not provided then the Cesium Ion URL is expected to have been passed into the `TilesRenderer` constructor. If `autoRefreshToken` is set to true then the plugin will automatically perform a new root tile request once the existing token has expired after an hour.

## TextureOverlayPlugin

_available in the examples directory_

Plugin for loading alternate texture sets and assigning them to geometry in the tile set.

### .textureUpdateCallback

```
textureUpdateCallback : ( tile, model, plugin ) => void;
```

Callback fired when the textures for a specific tile has been loaded. This function is required.

### .waitForLoadCompletion

```js
waitForLoadCompletion : Boolean
```

If true then the update callback will only fire for tiles once all the associated textures have loaded.

### constructor

```
constructor( options = {
	textureUpdateCallback: null,
	waitForLoadCompletion: true,
} );
```

### .getTexturesForTile

```js
getTexturesForTile( tile : Tile, target = {} : Object ) : target
```

### .registerLayer

```js
registerLayer( name : string, customTextureCallback : Function ) : void
```

### .unregisterLayer

```js
unregisterLayer( name : string ) : void
```

### .hasLayer

```js
hasLayer( name : string ) : boolean
```

## TileCompressionPlugin

Plugin that processes geometry buffer attributes into smaller data types on load and disables texture mipmaps to save memory. While geometry attribute compression is disabled by default, the default target attribute size when enabled is fairly aggressive and may cause artifacts. Can reduce geometry memory footprint by more than half and texture memory by around a third.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// Whether to generate normals if they don't already exist.
	generateNormals: false,

	// Whether to disable use of mipmaps on all textures since they are typically
	// not necessary.
	disableMipmaps: true,

	// Whether to compress and quantize attributes.
	compressIndex: true,
	compressNormals: false,
	compressUvs: false,
	compressPosition: false,

	// The TypedArray type to use when compressing attributes.
	uvType: Int8Array,
	normalType: Int8Array,
	positionType: Int16Array,
}
```

## TilesFadePlugin

Plugin that overrides material shaders to fade tile geometry in and out as tile LODs change. Based on [this Cesium article](https://cesium.com/blog/2022/10/20/smoother-lod-transitions-in-cesium-for-unreal/) on the topic.

The plugin will dispatch `fade-change`, `fade-start`, and `fade-end` events per tile on the TilesRenderer when the animation updates. These events should be used in addition to any others required when performing on-demand rendering.

### .fadeDuration

```js
fadeDuration = 250 : number
```

Amount of time a tile takes to fade in and out.

### .maximumFadeOutTiles

```js
maximumFadeOutTiles = 50 : number
```

Maximum number of tiles to be fading at once. If this quantity is exceeded the animation ends and tiles pop in.

### .fadeRootTiles

```js
fadeRootTiles = false : boolean
```

Whether to fade the root tile objects in.

## GLTFExtensionsPlugin

Plugin for automatically adding common extensions and loaders for 3d tiles to the GLTFLoader used for parsing tile geometry. Additionally, a DRACOLoader is added, as well, to support loading compressed point cloud files.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// If true then the StructuralMetadata and MeshFeatures extensions are included.
	metadata: true,

	// If true then the Cesium RTC Center extension is included.
	rtc: true,

	// A list of other extensions to include in the loader. All elements are passed to the "GLTFLoader.register" function.
	plugins: [],

	// DRACOLoader, KTX2Loader, and MeshoptDecoder instances to add to the loader.
	dracoLoader: null,
	ktxLoader: null,
	meshoptDecoder: null,

	// Whether to automatically dispose of the DRACO and KTX Loaders when the plugin is disposed.
	autoDispose: true,
}
```

## ReorientationPlugin

Plugin for automatically re-orienting and re-centering the tile set to make it visible near the origin and facing the right direction.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// The latitude, longitude, and height of the point on the surface to orient to. Lat and lon are in radians. If
	// no coordinates are provided then the plugin tries to determine if the tile set is a tile set on the globe surface
	// and estimates the coordinates.
	lat: null,
	lon: null,
	height: 0,

	// If a set of lat and lon coordinates cannot be determined then the tile set is simple oriented so the provided axes
	// is oriented to three.js' +Y up direction. Valid values are positive or negative x, y, or z.
	up: '+z',

	// Whether or not to recenter the tile set.
	recenter: true,
}
```

### transformLatLonHeightToOrigin

```js
transformLatLonHeightToOrigin( lat, lon, height = 0 ) : void
```

Transforms the centers the tile set such that the given coordinates and height are positioned at the origin with "X" facing west and "Z" facing north.

## UnloadTilesPlugin

Plugin that unloads geometry, textures, and materials of any given tile when the visibility changes to non-visible to save GPU memory. The model still exists on the CPU until it is completely removed from the cache.

### .estimatedGpuBytes

```js
estimatedGPUBytes : number
```

The number of bytes that are actually uploaded to the GPU for rendering compared to `lruCache.cachedBytes` which reports the amount of texture and geometry buffer bytes actually downloaded.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// The amount of time to wait in milliseconds before unloading tile content from the GPU. This option can be
	// used to account for cases where the user is moving the camera and tiles are coming in and out of frame.
	delay: 0,

	// The amount of bytes to unload to.
	bytesTarget: 0,
}
```

## BatchedTilesPlugin

Plugin that uses three.js' BatchedMesh to limit the number of draw calls required and improve performance. The BatchedMesh geometry and instance size are automatically resized and optimized as new geometry is added and removed. The max number of instances to generate is limited by the max size of a 3d texture. Note that the `renderer` field is required.

> [!WARNING]
> All tile geometry rendered with BatchedMesh will use the same material and only a single material "map" is supported. Only tiles geometry containing a single mesh are supported. Not compatible with other plugins that modify mesh materials or rely on other bespoke mesh data (eg TilesFadePlugin, DebugTilesPlugin, GLTF Metadata extensions).

### .constructor


```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// WebGLRenderer used for generating a WebGLArrayRenderTarget - required.
	renderer,

	// The initial number of instances to use for rendering
	instanceCount: 500,

	// The minimum amount of vertex and index space to save per tile geometry added. If adequate tile space is already allocated
	// when a new tile geometry is added then it can prevent more expensive geometry resizing and optimization.
	vertexCount: 1000,
	indexCount: 1000,

	// The amount to increase the geometry and instance allocation when the operations must occur
	expandPercent: 0.25,

	// The material to use for the BatchedMesh. The material of the first tile rendered with be used if not set.
	material: null,

	// If true then the original scene geometry is automatically discarded after adding the geometry to the batched mesh to save memory.
	// This must be set to "false" if being used with plugins such as "UnloadTilesPlugin".
	discardOriginalContent: true,

	// The value to use for the x and y dimensions of the array texture. If set to null then the array texture is sized based on
	// the first texture encountered.
	textureSize: null,
}
```

## DeepZoomImagePlugin

Plugin to add support for the [DeepZoomImage format](https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN). Only a single embedded "Image" is supported. The DeepZoomImage xml file should be passed in as the TilesRenderer url.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// Whether to shift the DZI tiles so the image is centered at the origin rather than
	// at the top left corner
	center: false,

	// The scale of a pixel in the image
	pixelSize: 0.01,

	// If true then the TilesRenderer error target is set to the "devicePixelRatio".
	useRecommendedSettings: true,
}
```

## LoadRegionPlugin

Plugin to enhances the TilesRenderer by enabling selective loading of tiles based on regions or volumes up to a specified geometric error target. Regions take shapes in the local tile set coordinate frame:

```js
import { LoadRegionPlugin, RayRegion, SphereRegion, OBBRegion, OBB } from '3d-tiles-renderer/plugins'
import { Ray, Sphere } from 'three'

// Create a Ray-based region with a target error of 5
const rayRegion = new RayRegion( 5, new Ray( /* ... */ ) );
const sphereRegion = new SphereRegion( 5, new Sphere( /* ... */ ) );
const obbRegion = new OBBRegion( 5, new OBB( /* ... */ ) );

// Register the regions to load
const plugin = new LoadRegionPlugin();
plugin.addRegion( rayRegion );
plugin.addRegion( sphereRegion );
plugin.addRegion( obbRegion );

// Register the plugin
tiles.registerPlugin( plugin );
```

Custom regions can also be specified - see the structure definition in `addRegion`.

### .addRegion

```js
addRegion( region: Region ): void
```

You can define a custom region by providing functions to determine Intersection logic and Error Calculation

```js
{
	// Custom function that determines whether a tile's bounding volume intersects this region.
	intersectsTile: ( boundingVolume: TileBoundingVolume, tile: Tile, tilesRenderer: TilesRenderer ) => boolean,

	// Custom function to calculate the error target dynamically for tiles in this region.
	calculateError: ( tile: Tile, tilesRenderer: TilesRenderer ) => number,
}
```

### .removeRegion

```js
removeRegion( region: Region ): void
```

Removes the specified region.

### .hasRegion

```js
hasRegion( region: Region ): boolean
```

Returns whether the region is already registered.

### .clearRegions

```js
clearRegions(): void
```

Remove all regions.

## TileFlatteningPlugin

A plugin that takes a shape as a mesh and direction along which to "flatten" vertices to the surface of the shape. Useful for shifting tile geometry to make room for new assets. Not compatible with other plugins that modify geometry such as `BatchedTilesPlugin`.

### hasShape

```js
hasShape( shape: Object3D ): boolean
```

Returns whether the given object has been passed in as a shape.

### addShape

```js
addShape( shape: Object3D, direction: Vector3 ): void
```

Adds the given object as a shape to flatten to in addition to the direction to flatten.

### updateShape

```js
updateShape( shape: Object3D ): void
```

Notifies the plugin that the given shape (geometry, position) has been changed and "tile flattening" needs to be regenerated.

### deleteShape

```js
deleteShape( shape: Object3D ): boolean
```

Deletes the given shape and regenerates the tile flattening.

### clearShapes

```js
clearShapes(): void
```

Deletes all shapes and resets the tiles.
