# 3d-tiles-renderer/three

Three.js renderer for 3D Tiles. Provides `TilesRenderer`, camera controls, and Three.js-specific utilities built on top of the core package.

```js
import { TilesRenderer } from '3d-tiles-renderer';

// ... initialize three scene ...

const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );

scene.add( tilesRenderer.group );

function renderLoop() {

	requestAnimationFrame( renderLoop );
	camera.updateMatrixWorld();
	tilesRenderer.update();
	renderer.render( scene, camera );

}
```

For more setup examples including custom materials, DRACO compression, Cesium Ion, and camera controls, see the [Three.js usage guide](../../USAGE.md).

See the [API reference](./API.md) for full class and method documentation.
