# 3d-tiles-renderer/plugins

Plugins and extensions for the 3D Tiles renderer.

See the [API reference](./API.md) for full class and method documentation.

# Use

## GLTF Plugins

Set of three.js GLTFLoader plugins to be registered via `GLTFLoader.register`. To use with the TilesRenderer:

```js
const tiles = new TilesRenderer( url );
const loader = new GLTFLoader( tiles.manager );
loader.register( () => new GLTFMeshFeaturesExtension() );
loader.register( () => new GLTFStructuralMetadataExtension() );
loader.register( () => new GLTFCesiumRTCExtension() );
tiles.manager.addHandler( /(gltf|glb)$/g, loader );
```

To retrieve feature IDs at a raycasted hit point using `GLTFMeshFeaturesExtension`:

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

## TilesRenderer Plugins

Plugins to register to the TilesRenderer instance to modify behavior:

```js
const tiles = new TilesRenderer( url );
tiles.registerPlugin( new TileCompressionPlugin() );
tiles.registerPlugin( new TilesFadePlugin() );
```

## Cesium Ion Authentication Plugin

The `assetTypeHandler` callback is fired when an asset type other than 3DTiles is encountered. Use it to register additional plugins for supported types:

```js
tilesRenderer.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken,
	assetTypeHandler: ( type, tilesRenderer ) => {

		if ( type === 'TERRAIN' ) {

			tilesRenderer.registerPlugin( new QuantizedMeshPlugin() );

		}

	},
} ) );
```

# Example Plugins

The following plugins are available in the examples directory and are not part of the main package.

## TextureOverlayPlugin

_available in the examples directory_

Plugin for loading alternate texture sets and assigning them to geometry in the tileset.

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

## TopoLinesPlugin

_available in the examples directory_

Plugin for rendering topographic contour lines on the tileset.

### .constructor

```js
constructor( options : Object )
```

Available options are as follows:

```js
{
	// whether the data set is 'planar' or 'ellipsoid'
	projection = 'planar',

	// the thickness of the topo lines
	thickness = 1,

	// options for topographic lines
	// "topoLimit" refers to the min and max distances between each topo line
	// "topoFadeLimit" refers to the fade in and out point of the topo lines as a whole
	topoColor = new Color( 0xffffff ),
	topoOpacity = 0.5,
	topoLimit = isPlanar ? new Vector2( 0.1, 1e10 ) : new Vector2( 1, 1e10 ),
	topoFadeLimit = isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 0, 1e4 ),

	// options for cartesian and cartographic lines when in planar and ellipsoid mode respectively
	cartoColor = new Color( 0xffffff ),
	cartoOpacity = isPlanar ? 0 : 0.5,
	cartoLimit = new Vector2( 0.1, 1e10 ),
	cartoFadeLimit = isPlanar ? new Vector2( 0, 1e10 ) : new Vector2( 1.5 * 1e4, 1e6 ),
}
```
