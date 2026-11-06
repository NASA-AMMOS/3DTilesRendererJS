# PlayCanvas plugins

`TilesFadePlugin` adds opaque ordered-dither transitions to B3DM, glTF, and GLB
tiles, so the tile being replaced and its replacement draw complementary pixels
instead of popping:

```js
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';

const tiles = new TilesRenderer( url, app );
tiles.registerPlugin( new TilesFadePlugin( { fadeDuration: 250 } ) );
```

The plugin works with materials that use the PlayCanvas lit shader, such as the
`StandardMaterial` the glTF parser creates. While a tile fades, the fade is
added to its materials with the `litUserDeclarationPS` and `litUserMainStartPS`
shader chunks, ahead of any code the application set in those chunks, and
removed once the fade completes. Tiles that are not fading render with their
normal shader.

The engine's default glTF material, and materials shared between tiles, are
not faded; tiles using only those pop in and out as without the plugin.

The default `maximumFadeOutTiles` value is 50. As in the Three.js
implementation, exceeding it completes fades early only while the camera moves
more than 0.1 world units or rotates more than 0.25 radians in one frame; it is
not an unconditional cap.

The plugin uses the same 4x4 dither pattern as the Three.js plugin, and shares
the tile fade lifecycle and options of all engine plugins.
