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
getPropertyTextureInfo() : Array<Object>
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

TODO

## TilesFadePlugin

_available in the examples directory_

TODO
