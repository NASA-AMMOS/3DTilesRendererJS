# PlayCanvas Plugins

Plugins for the PlayCanvas `TilesRenderer`, exported from `3d-tiles-renderer/playcanvas/plugins`. The engine-agnostic plugins in `3d-tiles-renderer/core/plugins`, such as `CesiumIonAuthPlugin` and `GoogleCloudAuthPlugin`, work with the PlayCanvas renderer as well.

## ReorientationPlugin

Re-orients and re-centers the tileset so it is visible near the origin, with +Y up. If `lat` and `lon` are provided, that geographic location is moved to the origin, with X facing west and Z facing north. Otherwise the location is estimated from the root bounding volume of tilesets on the globe surface, and other tilesets are rotated so the `up` axis aligns with +Y.

It has the same options as the three.js plugin of the same name, but uses `TilesRenderer#setTilesetTransform`, which applies the transform in 64-bit precision. Earth-centered tilesets, such as Google Photorealistic 3D Tiles, need it to render without jitter, as PlayCanvas entity transforms are 32-bit.

```js
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { ReorientationPlugin } from '3d-tiles-renderer/playcanvas/plugins';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';

const tiles = new TilesRenderer( null, app );
tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: ION_TOKEN, assetId: '2275207', autoRefreshToken: true } ) );
tiles.registerPlugin( new ReorientationPlugin( { lat: 35.6586 * Math.PI / 180, lon: 139.7454 * Math.PI / 180 } ) );
```

| Option | Default | Description |
| --- | --- | --- |
| `lat` | `null` | Latitude in radians of the surface point to orient to (requires `lon`). |
| `lon` | `null` | Longitude in radians of the surface point to orient to (requires `lat`). |
| `height` | `0` | Height in meters above the ellipsoid surface. |
| `up` | `'+z'` | Axis to orient toward +Y when no location is available, one of `±x`, `±y`, `±z`. |
| `recenter` | `true` | Whether to move the tileset to the origin. |
| `azimuth`, `elevation`, `roll` | `0` | Additional rotation in radians. |

## TilesFadePlugin

Fades tiles in and out as the level of detail changes, instead of popping, with an opaque ordered dither: the tile being replaced and its replacement draw complementary pixels, so no transparency sorting is needed. Built on `TilesFadePluginBase` from `3d-tiles-renderer/core/plugins`, with the same options as the three.js and Babylon.js plugins.

```js
import { TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';

tiles.registerPlugin( new TilesFadePlugin( { fadeDuration: 250 } ) );
```

While a tile fades, the fade is added to its materials with the `litUserDeclarationPS` and `litUserMainStartPS` shader chunks, and removed once the fade completes, so tiles that are not fading render with their normal shader. It works for materials using the lit shader, such as the `StandardMaterial` the glTF parser creates. Tiles whose materials are shared with other tiles are shown without fading.

| Option | Default | Description |
| --- | --- | --- |
| `fadeDuration` | `250` | Time in milliseconds for a tile to fully fade in or out. |
| `maximumFadeOutTiles` | `50` | Maximum simultaneous fade-out tiles. If exceeded while the camera moves quickly, tiles pop instead of fading. |
| `fadeRootTiles` | `false` | Whether root-level tiles fade in on their first appearance. |

## DebugTilesPlugin

Draws the bounding volumes of the visible tiles as lines, each tile in a random color, to help debug tile selection and culling. The lines are drawn with `AppBase#drawLineArrays` into the immediate layer, which cameras render by default.

```js
import { DebugTilesPlugin } from '3d-tiles-renderer/playcanvas/plugins';

const debugPlugin = new DebugTilesPlugin( { displayBoxBounds: true } );
tiles.registerPlugin( debugPlugin );
```

| Option | Default | Description |
| --- | --- | --- |
| `displayBoxBounds` | `false` | Draw the `box` bounding volumes. |
| `displaySphereBounds` | `false` | Draw the `sphere` bounding volumes. |
| `displayRegionBounds` | `false` | Draw the `region` bounding volumes. |
| `displayParentBounds` | `false` | Also draw the bounding volumes of the ancestors of the visible tiles. |
| `enabled` | `true` | Whether the plugin draws anything. |
