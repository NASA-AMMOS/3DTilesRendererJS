# Usage

> **Note:** The examples below use the **Three.js** renderer. For **Babylon.js** setup and usage, see the [Babylon.js renderer documentation](./src/babylonjs/renderer/README.md). For **React Three Fiber**, see the [R3F documentation](./src/r3f/README.md).

## Basic Three.js Setup

Setting up a basic application with a 3D Tileset rendered using Three.js
```js
import { TilesRenderer } from '3d-tiles-renderer';

// ... initialize three scene ...

const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );
tilesRenderer.addEventListener( 'load-root-tileset', () => {

	// optionally center the tileset in case it's far off center
	const sphere = new Sphere();
	tilesRenderer.getBoundingSphere( sphere );
	tilesRenderer.group.position.copy( sphere.center ).multiplyScalar( - 1 );

} );

scene.add( tilesRenderer.group );

renderLoop();

function renderLoop() {

	requestAnimationFrame( renderLoop );

	// The camera matrix is expected to be up to date
	// before calling tilesRenderer.update
	camera.updateMatrixWorld();
	tilesRenderer.update();
	renderer.render( scene, camera );

}
```

## Custom Material

Setting up a 3D Tileset using a custom material.

```js
const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );
tilesRenderer.addEventListener( 'load-model', ( { scene } ) => {

	// create a custom material for the tile
	scene.traverse( c => {

		if ( c.material ) {

			c.material = new MeshBasicMaterial();

		}

	} );

};

tilesRenderer.addEventListener( 'dispose-model', ( { scene } ) => {

	// dispose of any manually created materials
	scene.traverse( c => {

		if ( c.material ) {

			c.material.dispose();

		}

	} );

};
scene.add( tilesRenderer.group );
```

## Multiple TilesRenderers with Shared Caches and Queues

Using multiple tiles renderers that share LRUCache and PriorityQueue instances to cut down on memory and correctly prioritize downloads.

```js
// create multiple tiles renderers
const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );

const tilesRenderer2 = new TilesRenderer( './path/to/tileset2.json' );
tilesRenderer2.setCamera( camera );
tilesRenderer2.setResolutionFromRenderer( camera, renderer );

// set the second renderer to share the cache and queues from the first
tilesRenderer2.lruCache = tilesRenderer.lruCache;
tilesRenderer2.downloadQueue = tilesRenderer.downloadQueue;
tilesRenderer2.parseQueue = tilesRenderer.parseQueue;
tilesRenderer2.processNodeQueue = tilesRenderer.processNodeQueue;

// add them to the scene
scene.add( tilesRenderer.group );
scene.add( tilesRenderer2.group );
```

## Adding DRACO Decompression Support

Adding support for DRACO decompression within the GLTF files that are transported in B3DM and I3DM formats. The same approach can be used to add support for KTX2 and DDS textures. Alternatively the [GLTFExtensionsPlugin](./src/plugins/README.md#gltfextensionsplugin) can be used to simplify the setup.

```js

// Note the DRACO compression files need to be supplied via an explicit source.
// We use unpkg here but in practice should be provided by the application.
// Decompressing GLTF requires the GLTF branch of the draco decoder
const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.123.0/examples/js/libs/draco/gltf/' );

const loader = new GLTFLoader( tilesRenderer.manager );
loader.setDRACOLoader( dracoLoader );

tilesRenderer.manager.addHandler( /\.(gltf|glb)$/g, loader );
```

Adding support for DRACO decompression within the PNTS files requires a different draco decoder. See more info [here](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/libs/draco).

```js

// Note the DRACO compression files need to be supplied via an explicit source.
// We use unpkg here but in practice should be provided by the application.
// Decompressing point clouds should use the master branch of the draco decoder in place of the GLTF branch
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.123.0/examples/js/libs/draco/' );

const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.manager.addHandler( /\.drc$/g, dracoLoader );
```


## Loading from Cesium Ion

Loading from Cesium Ion requires some extra fetching of the ion url endpoint, as well as a temporary bearer access token. A full example is found in the ionExample.js file in the examples folder.

Set the desired assetId as well as your Ion AccessToken. [More reading is provided by the Cesium REST API documentation](https://cesium.com/docs/rest-api/).

```js
// fetch a temporary token for the Cesium Ion asset
const url = new URL( `https://api.cesium.com/v1/assets/${ assetId }/endpoint` );
url.searchParams.append( 'access_token', accessToken );

fetch( url, { mode: 'cors' } )
	.then( res => res.json() )
	.then( json => {

		url = new URL( json.url );

		const version = url.searchParams.get( 'v' );
		tiles = new TilesRenderer( url );
		tiles.fetchOptions.headers = {};
		tiles.fetchOptions.headers.Authorization = `Bearer ${json.accessToken}`;

		// Prefilter each model fetch by setting the cesium Ion version to the search
		// parameters of the url.
		tiles.preprocessURL = uri => {

			uri = new URL( uri );
			uri.searchParams.append( 'v', version );
			return uri.toString();

		};

	} );
```

## Render On Change

The tileset and model load callbacks can be used to detect when the data has changed and a new render is necessary.

```js
let needsRerender = true;
const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.addEventListener( 'load-tileset', () => needsRerender = true );
tilesRenderer.addEventListener( 'load-model', () => needsRerender = true );

function renderLoop() {

	requestAnimationFrame( renderLoop );
	if ( needsRerender ) {

		needsRerender = false;
		camera.updateMatrixWorld();
		tilesRenderer.update();
		renderer.render( scene, camera );

	}

}
renderLoop();
```

## Read Batch Id and Batch Table Data

How to find the batch id and batch table associated with a mesh and read the data.

```js
const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );

// ...checking intersections...

const intersects = raycaster.intersectObject( scene, true );
if ( intersects.length ) {

	const { face, object } = intersects[ 0 ];
	const batchidAttr = object.geometry.getAttribute( '_batchid' );

	if ( batchidAttr ) {

		// Traverse the parents to find the batch table.
		let batchTableObject = object;
		while ( ! batchTableObject.batchTable ) {

			batchTableObject = batchTableObject.parent;

		}

		// Log the batch data
		const batchTable = batchTableObject.batchTable;
		const hoveredBatchid = batchidAttr.getX( face.a );
		const batchData = batchTable.getDataFromId( hoveredBatchid );
		console.log( batchData );

	}

}
```
