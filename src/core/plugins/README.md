# 3d-tiles-renderer/core/plugins

Framework-agnostic plugins for the 3D Tiles renderer. These plugins work with any renderer built on top of the core package, including Three.js and Babylon.js.

```js
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin, ImplicitTilingPlugin } from '3d-tiles-renderer/core/plugins';

const tiles = new TilesRenderer( url );
tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken } ) );
tiles.registerPlugin( new ImplicitTilingPlugin() );
```

See the [API reference](./API.md) for full class and method documentation.

## AdaptiveErrorTargetPlugin

A full cache prevents the traversal from queuing the tiles it asked for, which is reported by `stats.refused`. If the camera then stops moving, nothing is downloaded, nothing is unloaded, and the scene stays under refined for as long as the view is held. `AdaptiveErrorTargetPlugin` watches for that state and raises `errorTarget` a step at a time until the traversal asks for a set of tiles that fits, then steps it back down to the original value once the cache has room again.

```js
tiles.registerPlugin( new AdaptiveErrorTargetPlugin( {

	// the cache must be full and refusing tiles for this long before each step
	holdTime: 2500,

	// each step multiplies or divides the error target by this value
	factor: 1.5,

	// never raise the error target above this value, defaults to 4x the initial target
	maxErrorTarget: null,

	onChange: ( { errorTarget, reason } ) => console.log( errorTarget, reason ),

} ) );
```

Raising the error target does not load more tiles, it asks for fewer and coarser ones, so the scene is displayed at a lower quality than requested. The error target is never raised above `maxErrorTarget` and never lowered below the value the application assigned.
