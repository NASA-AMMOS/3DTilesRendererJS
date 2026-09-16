# Babylon.js plugins

`TilesFadePlugin` adds opaque ordered-dither transitions to ordinary B3DM,
glTF, and GLB tiles:

This plugin requires compatible `@babylonjs/core` and `@babylonjs/loaders`
versions 9.26.1 or later.

```js
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { TilesFadePlugin } from '3d-tiles-renderer/babylonjs/plugins';

const tiles = new TilesRenderer( url, scene );
tiles.registerPlugin( new TilesFadePlugin( { fadeDuration: 250 } ) );
```

The initial Babylon.js integration supports one active camera and non-instanced
meshes using opaque `StandardMaterial` or PBR materials, including
`MultiMaterial` leaves and shared or frozen materials. Hardware and thin
instances, batching, and standalone shadow, depth, picking, outline, or custom
passes are not included.

The default `maximumFadeOutTiles` value is 50. As in the Three.js
implementation, exceeding it completes fades early only while the camera moves
more than 0.1 world units or rotates more than 0.25 radians in one frame; it is
not an unconditional cap.

Babylon.js uses the 8x8 pattern provided by
`DitheredTileFadeMaterialPlugin`; the Three.js plugin uses a 4x4 pattern, so
their transition timing and lifecycle match without requiring identical
dither pixels. Both engine plugins share the same tile fade lifecycle and
options; their camera and material integration remains engine-specific.
