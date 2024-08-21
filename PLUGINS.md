Documentation for plugins and extensions provided by the project and in the examples folder.

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
tiles.registerPlugin( new TilesCompressionPlugin() );
tiles.registerPlugin( new TilesFadePlugin() );
```

## DebugTilesPlugin

Plugin TilesRenderer that includes helpers for debugging and visualizing the various tiles in the tile set. Material overrides will not work as expected with this plugin. The plugin includes additional logic and initialization code which can cause performance loss so it's recommended to only use this when needed.

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
displayBoxBounds = false : Boolean
```

Display wireframe bounding boxes from the tiles `boundingVolume.box` (or derived from the region bounds) for every visible tile.

### .displaySphereBounds

```js
displaySphereBounds = false : Boolean
```

Display wireframe bounding boxes from the tiles `boundingVolume.sphere` (or derived from the bounding box / region bounds) for every visible tile.

### .displayRegionBounds

```js
displayRegionBounds = false : Boolean
```

Display wireframe bounding rgions from the tiles `boundingVolume.region` for every visible tile if it exists.

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
constructor( { accessToken : String } )
```

Takes the Google Cloud access token.

## CesiumIonAuthPlugin

### constructor

```js
constructor( { accessToken : String, assetId = null : String | null } )
```

Takes the CesiumIon access token and optionally the asset id. If the asset id is not provided then the Cesium Ion URL is expected to have been passed into the `TilesRenderer` constructor.

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

## TilesCompressionPlugin

_available in the examples directory_

Plugin that processes geometry buffer attributes into smaller data types on load and disables texture mipmaps to save memory. The default compression is fairly aggressive and may cause artifacts. Can reduce geometry memory footprint by more than half.

### .constructor

```js
constructor( options : Object )
```

See available options and descriptions in class implementation.

## TilesFadePlugin

_available in the examples directory_

Plugin that overrides material shaders to fade tile geometry in and out as tile LODs change. Based on [this Cesium article](https://cesium.com/blog/2022/10/20/smoother-lod-transitions-in-cesium-for-unreal/) on the topic.

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

# Controls

## EnvironmentControls

### .enabled

```js
enabled = true : boolean
```

Whether the controls are enabled and active.

### .enableDamping

```js
enableDamping = false : boolean
```

Flag indicating whether residual inertial animation is played after interaction finishes.

### .constructor

```js
constructor(
	scene = null : Scene,
	camera = null : Camera,
	domElement = null : DomElement,
)
```

Takes the scene to raycast against for click events, the camera being animated, and the dom element to listen for clicks on.

### .attach

```js
attach( domElement : DomElement ) : void
```

The dom element to attach to for events.

### .detach

```js
detach() : void
```

Detaches from the current dom element.

### .setCamera

```js
setCamera( camera : Camera ) : void
```

Sets the camera the controls are using.

### .setScene

```js
setScene( scene : Object3D ) : void
```

The scene to raycast against for control interactions.

### .update

```js
update( deltaTime = null ) : void
```

Updates the controls. Takes a delta time value in seconds to normalize inertia and damping speeds. Defaults to the time between call to the function.

### .dispose

```js
dispose() : void
```

Detaches all events and makes the controls unusable.

### .getPivotPoint

```js
getPivotPoint( target : Vector3 ) : target
```

Gets the last used interaction point.

## GlobeControls

_extends [EnvironmentControls](#environmentcontrols)_

### .constructor

```js
constructor(
	scene = null : Scene,
	camera = null : Camera,
	domElement = null : DomElement,
	tilesRenderer = null : GoogleTilesRenderer,
)
```

Takes the same items as `EnvironmentControls` in addition to the Google globe tiles renderer.

### .updateCameraClipPlanes

```js
updateCameraClipPlanes( camera : Camera ) : void
```

Updates the clip planes (and position if orthographic) of the given camera so the globe is encapsulated correctly. Used when working with the transition manager to make sure both cameras being transitioned are positioned properly.

## CameraTransitionManager

Helper class for performing a transition animation between a perspective and orthographic camera.

```js
const transition = new CameraTransitionManager( perspCamera, orthoCamera );
toggleButton.addEventListener( 'click', () => transition.toggle() );

// ...

renderer.setAnimationLoop( () => {

    // set transition.fixedPoint to point that should remain stable

    transition.update();
    renderer.render( transition.camera, scene );

} );
```

### .fixedPoint

```js
fixedPoint = ( 0, 0, 0 ) : Vector3
```

The point that will represents the plan that will remain fixed during the animation. This point should be in front of the cameras.

### .animating

```js
readonly animation : boolean
```

A flag indicating whether the transition is currently animating or not.

### .camera

```js
readonly camera : Camera
```

The current camera to render with. Switches between the perspective camera, orthographic camera, and animated transition camera.

### .orthographicPositionalZoom

```js
orthographicPositionalZoom = true : boolean
```

Whether the orthographic camera position should be updated so be synchronized with the necessary perspective camera position so
the orthographic near clip planes do not get into into unexpected configurations.

### .constructor

```js
constructor( perspectiveCamera : PerspectiveCamera, orthographicCamera : OrthographicCamera )
```

Constructor takes the two cameras to animate between.

### .update

```js
update() : void
```

Synchronizes the two camera positions and performs the transition animation if active.

### .toggle

```js
toggle() : void
```

Starts the transition animation.
