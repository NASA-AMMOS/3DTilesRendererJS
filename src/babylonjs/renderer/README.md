# 3D Tiles Renderer for Babylon JS

Implementation of the TilesRendererBase class for Babylon js.

[Dingo Gap Mars dataset](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/babylonjs/mars.html)

[Google Photorealistic Tiles](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/babylonjs/googleMapsAerial.html)

The current implementation has the below limitations:
- Only supports scenes in right-handed mode (`scene.useRightHandedSystem = true`).
- BoundingBox + Frustum checks are using axis-aligned bounding boxes (rather than Oriented Bounding Boxes), causing false positives.
- Does not yet support the 3DTile boundingRegion.
- Limited caching of tiles.
- I3DM and PNTS are not supported.

# Use

```js
import { Engine, Scene } from '@babylonjs/core';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';

// create engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new Engine( canvas, true );

// right handed coordinate system is required
const scene = new Scene( engine );
scene.useRightHandedSystem = true;

// create the babylon tile renderer
const tiles = new TilesRenderer( TILESET_URL, scene );

// ... initialize the camera

// update the tiles
scene.onBeforeRenderObservable.add( () => {

	tiles.update();

} );

// render the scene
engine.runRenderLoop( () => {

	scene.render();

} );

```
