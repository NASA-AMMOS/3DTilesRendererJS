# 3D Tiles Renderer for Babylon JS

Implementation of the TilesRendererBase class for Babylon js.

# Use

```js
import * as BABYLON from 'babylonjs';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';

// create engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new BABYLON.Engine( canvas, true );

// right handed coordinate system is required
const scene = new BABYLON.Scene( engine );
scene.useRightHandedSystem = true;

// create the babylon tile renderer
const tiles = new BabylonTilesRenderer( TILESET_URL, scene );

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
