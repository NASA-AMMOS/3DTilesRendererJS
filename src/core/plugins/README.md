# 3d-tiles-renderer/core/plugins

Framework-agnostic plugins for the 3D Tiles renderer. These plugins work with any renderer built on top of the core package, including Three.js and Babylon.js.

```js
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin, ImplicitTilingPlugin } from '3d-tiles-renderer/core/plugins';

const tiles = new TilesRenderer( url );
tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken } ) );
tiles.registerPlugin( new ImplicitTilingPlugin() );
```

See the [API reference](./API.md) for full class and method documentation.
