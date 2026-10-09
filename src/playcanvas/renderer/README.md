# 3D Tiles Renderer for PlayCanvas

Implementation of the TilesRendererBase class for [PlayCanvas](https://playcanvas.com/). Tile content is loaded with the PlayCanvas glTF parser, so the glTF extensions supported by the engine are available, and it renders with both WebGL2 and WebGPU.

[Dingo Gap Mars dataset](https://nasa-ammos.github.io/3DTilesRendererJS/playcanvas/index.html)

[Google Photorealistic Tiles](https://nasa-ammos.github.io/3DTilesRendererJS/playcanvas/googleMapsAerial.html)

The current implementation has the below limitations:
- Only glTF, GLB and B3DM tile content is supported. I3DM, PNTS and CMPT are not.
- Earth-centered tilesets are rendered precisely near one location, the one moved to the origin with the `ReorientationPlugin` (see below). Precision decreases with the distance from it, so flying across the globe would need the location to follow the camera.
- The PlayCanvas plugins are `ReorientationPlugin`, `TilesFadePlugin` and `DebugTilesPlugin` (bounding volumes only, no tile coloring modes). The engine-agnostic plugins in `3d-tiles-renderer/core/plugins`, such as `CesiumIonAuthPlugin` and `GoogleCloudAuthPlugin`, work as well.
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

## Earth-centered tilesets

PlayCanvas entity transforms are 32-bit, which cannot represent Earth-centered coordinates, millions of meters from the origin, precisely enough. The renderer keeps tile transforms, bounding volumes and glTF node transforms in 64-bit, and `tiles.setTilesetTransform( matrix )` applies a transform to the whole tileset in 64-bit before it is placed under `tiles.group`. Use it, or the `ReorientationPlugin` from `3d-tiles-renderer/playcanvas/plugins`, which sets it, rather than transforming `tiles.group`, to bring a location to the origin:

```js
import { ReorientationPlugin } from '3d-tiles-renderer/playcanvas/plugins';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';

const tiles = new TilesRenderer( null, app );
tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: ION_TOKEN, assetId: '2275207', autoRefreshToken: true } ) );
tiles.registerPlugin( new ReorientationPlugin( { lat: 35.6586 * Math.PI / 180, lon: 139.7454 * Math.PI / 180 } ) );
```

Data providers such as Google require their attributions to be displayed, which are returned by `tiles.getAttributions()`.

## Events

Events can be subscribed to with `addEventListener` / `removeEventListener`, or with the `on` / `off` aliases.

```js
tiles.on( 'load-model', ( { scene, tile } ) => {

	// scene is the entity created for the tile content

} );
```
