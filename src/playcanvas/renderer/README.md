# 3D Tiles Renderer for PlayCanvas

Implementation of the TilesRendererBase class for [PlayCanvas](https://playcanvas.com/). Tile content is loaded with the PlayCanvas glTF parser, so the glTF extensions supported by the engine are available, and it renders with both WebGL2 and WebGPU.

[Dingo Gap Mars dataset](https://nasa-ammos.github.io/3DTilesRendererJS/playcanvas/index.html)

The current implementation has the below limitations:
- Only glTF, GLB and B3DM tile content is supported. I3DM, PNTS and CMPT are not.
- Only `box` and `sphere` bounding volumes are supported. Tiles with only a `region` volume are not displayed.
- PlayCanvas transforms are 32-bit, so Earth-centered tilesets, such as Google Photorealistic Tiles, are not rendered precisely.
- There are no PlayCanvas-specific plugins yet. The engine-agnostic plugins in `3d-tiles-renderer/core/plugins` can be used.
- Raycasting is not supported.

# Use

```js
import { Application, Entity } from 'playcanvas';
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';

const canvas = document.getElementById( 'renderCanvas' );
const app = new Application( canvas );
app.start();

// camera
const camera = new Entity( 'camera' );
camera.addComponent( 'camera' );
app.root.addChild( camera );

// create the tiles renderer and add its root entity to the scene
const tiles = new TilesRenderer( TILESET_URL, app );
tiles.setCamera( camera.camera );
app.root.addChild( tiles.group );

// update the tiles every frame, after the camera has moved
app.on( 'update', () => {

	tiles.update();

} );
```

Tile content is created as entities with render components under `tiles.group`. Use `tiles.renderOptions` to pass options such as `castShadows` or `layers` to the render components, and `tiles.assetOptions` to pass glTF parser callbacks to the `container` assets the content is loaded with.

## Compressed content

Tiles with Draco compressed meshes (`KHR_draco_mesh_compression`) or KTX2 textures (`KHR_texture_basisu`) need the engine decoders to be configured before they load, otherwise those tiles fail to load. The decoders are not part of the `playcanvas` npm package; they are available in the engine repository under [`examples/assets/wasm`](https://github.com/playcanvas/engine/tree/main/examples/assets/wasm).

```js
import { basisInitialize, dracoInitialize } from 'playcanvas';

dracoInitialize( {
	jsUrl: 'wasm/draco/draco.wasm.js',
	wasmUrl: 'wasm/draco/draco.wasm.wasm',
} );

basisInitialize( {
	glueUrl: 'wasm/basis/basis.wasm.js',
	wasmUrl: 'wasm/basis/basis.wasm.wasm',
	fallbackUrl: 'wasm/basis/basis.js',
} );
```

WebP textures (`EXT_texture_webp`) are decoded by the browser and need no setup.

## Events

Events can be subscribed to with `addEventListener` / `removeEventListener`, or with the `on` / `off` aliases.

```js
tiles.on( 'load-model', ( { scene, tile } ) => {

	// scene is the entity created for the tile content

} );
```
