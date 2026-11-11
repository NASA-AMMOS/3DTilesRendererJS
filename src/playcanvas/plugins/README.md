# PlayCanvas plugins

`TilesFadePlugin` adds opaque ordered-dither transitions to ordinary B3DM,
glTF, and GLB tiles:

```js
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';

const tiles = new TilesRenderer( url, app );
tiles.registerPlugin( new TilesFadePlugin( { fadeDuration: 250 } ) );
```

The plugin supports materials that use the PlayCanvas lit shader, such as the
`StandardMaterial` the glTF parser creates. The engine's default glTF material
and materials shared between tiles are not faded, so tiles using only those
appear without a transition.
