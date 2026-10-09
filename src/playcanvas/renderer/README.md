# 3D Tiles Renderer for PlayCanvas

Implementation of the TilesRendererBase class for [PlayCanvas](https://playcanvas.com/). Tile content is loaded with the PlayCanvas glTF parser, so the glTF extensions supported by the engine are available, and it renders with both WebGL2 and WebGPU.

[Dingo Gap Mars dataset](https://nasa-ammos.github.io/3DTilesRendererJS/playcanvas/index.html)

The current implementation has the below limitations:
- Only glTF, GLB and B3DM tile content is supported. I3DM, PNTS and CMPT are not.
- Only `box` and `sphere` bounding volumes are supported, not `region`.
- Earth-scale tilesets such as Google Photorealistic Tiles are not supported yet. Tile transforms are composed in 64-bit, but PlayCanvas renders with 32-bit matrices, which are not precise enough for Earth-centered coordinates.
- No plugins are available yet, other than the engine-agnostic ones in `3d-tiles-renderer/core/plugins`.
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

Tile content is created as entities with render components under `tiles.group`. Use `tiles.renderOptions` to pass options such as `castShadows` or `layers` to the render components, and `tiles.assetOptions` to pass glTF parser callbacks to the `container` assets the content is loaded with. Compressed content needs the engine decoders to be configured, using `dracoInitialize` for Draco and `basisInitialize` for KTX2.

Events can be subscribed to with `addEventListener` / `removeEventListener`, or with the `on` / `off` aliases.

```js
tiles.on( 'load-model', ( { scene, tile } ) => {

	// scene is the entity created for the tile content

} );
```
