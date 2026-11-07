# 3d-tiles-renderer/core/plugins

Framework-agnostic plugins for the 3D Tiles renderer. These plugins work with any renderer built on top of the core package, including Three.js and Babylon.js.

# Community Plugins & Integrations

#### [3d-tiles-renderer-3tz](https://github.com/zalmoxes-laran/3d-tiles-renderer-3tz)

Plugin to loading and rendering 3tz files.

# Use

```js
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin, ImplicitTilingPlugin } from '3d-tiles-renderer/core/plugins';

const tiles = new TilesRenderer( url );
tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken } ) );
tiles.registerPlugin( new ImplicitTilingPlugin() );
```

See the [API reference](./API.md) for full set of classes and method documentation.
