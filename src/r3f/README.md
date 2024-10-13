# 3D Tiles React Components

Set of components for loading and rendering 3D Tiles in [@react-three/fiber](https://r3f.docs.pmnd.rs/).

**Examples**

[Basic example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/basic.html)

[Cesium Ion example]()

[Goohle Photorealistic Tiles example]()

# Use

TODO

# Components

## TilesRenderer

### Standard syntax

A `TilesRenderer` component can be added to an r3f `Canvas` in order to add a 3d-tiles renderer to the scene, specified by a tileset URL prop.   
```jsx
<Canvas>
	<TilesRenderer url={ tilesetUrl } > </TilesRenderer>
</Canvas>

```

### Additional Options

Options can be passed via the below syntax, a dash-separated options path representation for properties like: 
 - [TilesRenderer](https://github.com/NASA-AMMOS/3DTilesRendererJS?tab=readme-ov-file#tilesrenderer)
 - [priorityQueue](https://github.com/NASA-AMMOS/3DTilesRendererJS?tab=readme-ov-file#priorityqueue) for `parseQueue` and `downloadQueue` settings like `maxJobs`
-  [LRUCache](https://github.com/NASA-AMMOS/3DTilesRendererJS?tab=readme-ov-file#lrucache-1)


```jsx

<TilesRenderer 
	url={ tilesetUrl } 
	// set options to the tilesRenderer object
	errorTarget= { 6 }
	errorThreshold= { 10 }
	// set options to grand-children of the tilesRenderer
	parseQueue-maxJobs={ 30 }
	downloadQueue-maxJobs={ 10 }
	// Additional lruCache options
	lruCache-minSize={ 0 }
	lruCache-minBytesSize={ 0.25 * 1e6 }
	lruCache-maxBytesSize={ 0.5 * 1e6 }
	fetchOptions={ { mode: 'cors' } }
	// event registration 
	onTileSetLoad={ e => {} }
	onModelLoad={ e => {} }
>
</TilesRenderer>

```

## TilesPlugin components

Plugins can be set as children of the TilesRenderer component to add additional functionality. 
```jsx

<TilesRenderer url={ tilesetUrl } >
	<TilesPlugin plugin={ PluginClassName } {...pluginProps} /> 
</TilesRenderer>

```


Existing TilesRenderer or GLTF [plugins](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/PLUGINS.md) can be passed to the `TilesPlugin` component to manage tile trasnformations and loading, like :
 - `GLTFExtensionsPlugin` to pass decompression loaders (draco and ktx)
 - `ReorientationPlugin` to apply a rigid transformation to the tileset to either center-it on origin or to the user-provided lat/lon/height as reference origin to the coordinate-system
 - `TilesFadePlugin` to have smooth tiles loading
 - `TileCompressionPlugin` to optimize tile mesh content to easen the burden on the GPU
 - `DebugTilesPlugin` to enable debugging bounding volumes, tiles coloring based on given metric

```jsx
<TilesRenderer url={ tilesetUrl } >
	<TilesPlugin plugin={ GLTFExtensionsPlugin } 
		dracoLoader={dracoLoader}
		ktxLoader={ktx2Loader}
		autoDispose={false}
		// both args and props/options do work to pass loaders
		// args = {{
		//   dracoLoader, ktxLoader:ktx2Loader
		// }}
	/>
	<TilesPlugin plugin={ ReorientationPlugin } 
		lat={props.lat * Math.PI / 180}
		lon={props.lon * Math.PI / 180}
		height={props.height || 100}
		up={'+z'}
		recenter={true}
		/> : 
		// If no lat/lon passed as props, recenter automatically
		<TilesPlugin plugin={ ReorientationPlugin } 
		recenter={true}
	/>  
	<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={500} />
	<TilesPlugin plugin={ TileCompressionPlugin } 
		generateNormals={false}
		disableMipmaps={true}
		compressIndex={false}
		// compressNormals={true} normalType={Int8Array}
		// compressUvs={false} uvType={Int8Array}
		// compressPosition={false} positionType={Int16Array}
	/>
	<TilesPlugin plugin={ DebugTilesPlugin } 
		colorMode={NONE} // NONE, SCREEN_ERROR, GEOMETRIC_ERROR, DISTANCE, DEPTH, RELATIVE_DEPTH, IS_LEAF, RANDOM_COLOR, RANDOM_NODE_COLOR, CUSTOM_COLOR, LOAD_ORDER
		displayBoxBounds={true}
		displayRegionBounds={false}
	/>
</TilesRenderer>

```


## Wrappers for Google or Cesium Ion Tilesets

Wrappers tiles-renderer components can be set-up for Google Photorealistic 3D Tiles or Cesium Ion tilesets, based on the corresponding GoogleCloud and CesiumIon auth plugins. Both these plugins setup the TielsRenderer url based on assetId for cesium, or default one for google. The Google auth plugin also sets-up default renderer settings if it is passed prop `useRecommendedSettings=true (default)` (`tiles.parseQueue.maxJobs = 10; tiles.downloadQueue.maxJobs = 30; tiles.errorTarget = 40`)

```jsx

function GoogleTiles( { children, apiToken, ...rest } ) {
	return (
		<TilesRenderer { ...rest }>
			<TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } useRecommendedSettings={true} />
			{ children }
		</TilesRenderer>
);
}

function CesiumIonTiles( { children, apiToken, assetId, ...rest } ) {
	return (
		<TilesRenderer { ...rest }>
			<TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken, assetId, autoRefreshToken : true  } } key={assetId} />
			{ children }
		</TilesRenderer>
	);
}

// Above auth wrappers can then be used this way: 
function App () {
	return <>
		<GoogleTiles apiToken={googleApiKey} >
			<TilesAttributionOverlay />
			{/* <TilesPlugin plugin={ CustomPlugin } {...pluginProps} /> */}
		</GoogleTiles>
	</>;
}
```

The `TilesAttributionOverlay` component handles crediting Google or Cesium data sources automatically, based on tileset or loaded tiles metadata, at the bottom-left of the screen. 

## EastNorthUpFrame

The `EastNorthUpFrame` is used to place 3D objects in a local reference frame that is centered on the provided origin, specified via lat/lon/height and euler angles props. `EastNorthUpFrame` does not transform the tileset root while `ReorientationPlugin` does transform the tileset. `EastNorthUpFrame`, instead, creates a frame on the surface of the globe that you can add children to if one, for example, want to create markers on the planet surface.

```jsx

function GeopositionnededModel(props) {
	return (
		<EastNorthUpFrame
			lat = {lat * Math.PI / 180}
			lon = {lon * Math.PI / 180}
			height = { 100}
			az = {0}
			el = {0}
			roll = {0}
		> 
			<SuziModel position={[0, 0, 2]} rotation-z={Math.PI/2 * 0} rotation-y={- Math.PI/2} scale={1} materialProps={{color:'#0000cc'}} />
		</EastNorthUpFrame>
	);
}


function SuziModel(props) {
	const { nodes } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf')
	return (
		<mesh castShadow receiveShadow geometry={nodes.Suzanne.geometry} {...props}>
			<meshStandardMaterial color={"#9d4b4b"} {...props.materialProps} />
		</mesh>
	)
}

```

## Controls

Components have also been exported for Controls to handle user-interaction, especially for globe-wide tilesets. These components are `EnvironmentControls` and `GlobeControls`, and they can be passed each its own set of options as below - only use one Control in your r3f canvas at a time. 

```jsx
<EnvironmentControls enableDamping={true} /> 
<GlobeControls enableDamping={true}  enable={true}  /> 
```
