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

Plugin that adds support for the [EXT_mesh_features](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features) extension. Adds a `Object3D.userData.meshFeatures` to each object with the extension that provides the following API:

### .getTextures

```js
getTextures() : Array<Texture>
```

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

### .getFeatures

```js
getFeatures( triangle : number, barycoord : Vector3 ) : Array<number>
```

### .getFeaturesAsync

```js
getFeaturesAsync( triangle : number, barycoord : Vector3 ) : Promise<Array<number>>
```

## GLTFStructuralMetadataExtension

Plugin that adds support for the [EXT_structural_metadata](https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata) extension. Adds a `Object3D.userData.structuralMetadata` to each object with the extension that provides the following API:

### .textures

```js
textures: Array<Texture>
```

### .schema

```js
schema: Object
```

### .getPropertyTableData

```js
getPropertyTableData(
	tableIndices : Array<number>,
	ids : Array<number>,
	target = [] : Array,
) : target
```

### .getPropertyTableInfo

```js
getPropertyTableInfo( tableIndices = null : Array<number> ) : Array<{
	name: string,
	className: string,
}>
```

### .getPropertyTextureData

```js
getPropertyTextureData(
	triangle : number,
	barycoord : Vector3,
	target = [] : Array,
) : target
```

### .getPropertyTextureDataAsync

```js
getPropertyTextureDataAsync(
	triangle : number,
	barycoord : Vector3,
	target = [] : Array,
) : Promise<target>
```

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

### .getPropertyAttributeData

```js
getPropertyAttributeData( attributeIndex : number, target = [] : Array) : target
```

### .getPropertyAttributeInfo

```js
getPropertyAttributeInfo() : Array<{
	name: string,
	className: string,
}>
```

## GLTFCesiumRTCExtension

Plugin that adds support for [CESIUM_RTC](https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Vendor/CESIUM_RTC/README.md) extension.

# TilesRenderer Plugins

Plugins to register to the TilesRenderer instance to modify behavior.

```js
const tiles = new TilesRenderer( url );
tiles.registerPlugin( new TilesCompressionPlugin() );
tiles.registerPlugin( new TilesFadePlugin() );
```

## TilesOverlayPlugin

_available in the examples directory_

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
update() : void
```

Updates the controls.

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
