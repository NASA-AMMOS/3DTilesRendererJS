# 3D Tiles React Components

Set of components for loading and rendering 3D Tiles in [@react-three/fiber](https://r3f.docs.pmnd.rs/).

**Examples**

[Basic example](https://nasa-ammos.github.io/3DTilesRendererJS/r3f/basic.html)

[Cesium Ion example](https://nasa-ammos.github.io/3DTilesRendererJS/r3f/ion.html)

[Google Photorealistic Tiles example](https://nasa-ammos.github.io/3DTilesRendererJS/r3f/globe.html)

[Tile Flattening Plugin example](https://nasa-ammos.github.io/3DTilesRendererJS/r3f/flattening.html)

# Use

## Simple

```jsx
import { TilesRenderer } from '3d-tiles-renderer/r3f';

const TILESET_URL = /* your tileset url */;
const cameraPosition = [ x, y, z ]; // Set the camera position so the tiles are visible
export default function App() {
  return (
    <Canvas camera={ { position: cameraPosition } }>
      <TilesRenderer url={ TILESET_URL } />
    </Canvas>
  );
}
```

## With Plugins, Controls, & Attribution

Basic set up for Google Photorealistic tiles, Globe controls, and an overlay for displaying data set attributions.

```jsx
import { TilesRenderer, TilesPlugin, GlobeControls, TilesAttributionOverlay } from '3d-tiles-renderer/r3f';
import { DebugTilesPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

export default function App() {
  return (
    <Canvas camera={ { position: [ 0, 0, 1e8 ] } }>
      <TilesRenderer>
        <TilesPlugin plugin={ DebugTilesPlugin } displayBoxBounds={ true } />
        <TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken: /* your api token here */ } } />
        <GlobeControls />
        <TilesAttributionOverlay />
      </TilesRenderer>
    </Canvas>
  );
}
```

## Cesium Ion & Google Cloud

Simplified wrappers for using the TilesRenderer with Cesium Ion and Google Cloud for Photorealistic Tiles. Use the `TilesAttributionOverlay` to display appropriate credits for the data sets.

```jsx
import { TilesRenderer, TilesPlugin } from '3d-tiles-renderer/r3f';
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

function GoogleTilesRenderer( { children, apiToken, ...rest } ) {
  return (
    <TilesRenderer { ...rest } key={ apiToken }>
      <TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } />
      { children }
    </TilesRenderer>
  );
}

function CesiumIonTilesRenderer( { children, apiToken, assetId, ...rest } ) {
  return (
    <TilesRenderer { ...rest } key={ apiToken + assetId }>
      <TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken, assetId } } />
      { children }
    </TilesRenderer>
  );
}
```

# Components

See the [API reference](./API.md) for full component and prop documentation.
