# Test Cases

Series of manually performed test cases for scenarios that are difficult / not feasible to test in an automated fashion.

## Verify all sibling tiles load

#### steps

1. Open the kitchen sink example.
1. Ensure `displayActiveTiles` is enabled.
1. Zoom in as much as possible so much of the tileset is not visible.
1. Wait until all tiles have loaded.
1. Disable the `enableUpdate` option.
1. Zoom out to view the whole tileset.

#### expected

Tiles are displayed all the way out to the edge of the tileset.

#### expected

Only tiles that were visible when zoomed in are displayed.

## Verify that active tiles render when displayActiveTiles = true

#### steps

1. Open the kitchen sink example.
1. Ensure `displayActiveTiles` is enabled.
1. Zoom in as much as possible so much of the tileset is not visible.
1. Wait until all tiles have loaded.
1. Disable the `enableUpdate` option.
1. Zoom out to view the whole tileset.

#### expected

Tiles are displayed all the way out to the edge of the tileset but they are not when `displayActiveTiles` is false.

## Verify tiles load up to errorTarget option

#### steps

1. Open the kitchen sink example.
1. Open the Javascript console.
1. Ensure `errorTarget` is set to `6`.
1. Enable `SCREEN_ERROR` color mode.
1. Zoom to various levels.
1. Click on tiles to view current screen space error in the console.

#### expected

No tiles are above the 6.0 error target threshold.

## Verify parent tiles do not load outside of the errorThreshold option

#### steps

1. Open the kitchen sink example.
1. Set error target to 2.
1. Set error threshold to 6.
1. Open the javascript console.
1. Hit "reload".
1. Inspect the tileset using the following script:

```js
tiles.traverse( tile => {

  let str = new Array( tile.__depth + 1 ).join( '  ' );
  str += tile.__error.toFixed( 2 );
  str += ' : ';
  str += tile.__loadingState;
  console.log( str )
  return tile.__isLeaf;

} );
```

#### expected

Verify that no parent tiles have loaded ( `__loadingState` should equal `0` ) if they have a threshold above 18 ( `( target + 1 ) * threshold` ).

## Verify tiles do not display past the maxDepth threshold

#### steps

1. Open the kitchen sink example.
1. Open the Javascript console.
1. Ensure `maxDepth` is set to `2`.
1. Enable `DEPTH` color mode.
1. Click on tiles to view current depth in the console.

#### expected

No tiles are above or equal to the 2 max depth value.

## Verify that tiles do not change when update() is not called

#### steps

1. Open the kitchen sink example.
1. Zoom all the way in.
1. Disable the `enableUpdate` option.
1. Zoom out.

#### expected

Verify tiles no longer update with the camera view.

## Verify tiles are only displayed within the camera frustum.

#### steps

1. Open the kitchen sink example.
1. Enable the third person camera view.
1. Zoom in the main view so part of the tileset is cut off.

#### expected

Verify only tiles in view of the frustum are displayed in the third person camera view.

## Verify that multiple cameras are taken into account when calculating error

#### steps

1. Open the kitchen sink example.
1. Enable the third person camera view.
1. Enable the second camera view.
1. Enable `GEOMETRIC_ERROR` color mode.
1. Zoom in the both cameras on opposite sides of the terrain so part of the tileset is cut off.

#### expected

Verify only tiles in view of both cameras frustums are displayed in the third person camera view and that tiles nearest the cameras have the lowest geometric error.

## Verify that raycasting works as expected

#### steps

1. Open the kitchen sink example.
1. Enable raycasting.
1. Hover over the surface of the terrain.
1. Repeat with firstHitOnly = false.

#### expected

Verify the hit marker is on the point under the mouse and that the normal lines up with the surface.

## Verify that raycasting works as expected with just root

#### steps

1. Open the kitchen sink example.
1. Enable raycasting.
1. Set max depth option to 1.
1. Hover over the surface of the terrain.
1. Repeat with firstHitOnly = false.

#### expected

Verify the hit marker is on the point under the mouse and that the normal lines up with the surface.

## Verify debug bounds display when displayBoxBounds = true

#### steps

1. Open the kitchen sink example.
1. Enable display box bounds option.
1. Move the camera around and zoom in and out.

#### expected

Verify the boxes change with the level of detail of the terrain.

## Verify it does not pop to higher lod on zoom out

#### steps

1. Open the kitchen sink example.
1. Set the error target to 2.
1. Set the error threshold to 6.
1. Zoom in all the way.
1. Click rebuild.
1. Wait for all tiles to load.
1. Set the error threshold to 1000 (or zoom out).

#### expected

Verify the display does not change and the tiles to not disappear while parent tiles load.

## Verify the renderer does not repeatedly try to download a failed tileset.json

#### steps

1. Open the kitchen sink example.
1. Set the location hash to `#./non/existing/tileset.json` to load a different tileset.

#### expected

Verify that an error is logged stating that the tileset could not be found just once.

## Verify that failing to load a parent tile does not prevent child tiles from loading

#### steps

1. Open the kitchen sink example with a midtile with broken content by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-broken-root-content.json).
1. Set the error threshold as high as it goes.
1. Click rebuild.

#### expected

Verify an error is logged stating that the root tile content could not be loaded, that the stats state that is 1 tile that failed, that "downloads" and "parsing" eventually settle to 0, and that child tiles continue to render.

## Verify that the tileset will render when a tile with no content is present

#### steps

1. Open the kitchen sink example with the no root content tileset by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-no-root-content.json).
1. Set the error threshold as high as it goes.
1. Click rebuild.

#### expected

Verify that the tileset still renders correctly.

## Verify example renderer can load a full url

#### steps

1. Open the kitchen sink example with a remote tileset by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#https://raw.githubusercontent.com/NASA-AMMOS/3DTilesRendererJS/master/example/data/tileset.json).

#### expected

Verify the tileset loads correctly and tehre are no errors in the console.

## Verify example tileset can be dragged offscreen

#### steps

1. Open the kitchen sink example with the no root content tileset by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-no-root-content.json).
1. Slowly move the tileset offscreen by right clicking and dragging the view.

#### expected

Verify no errors are logged.

## Verify tile data is disposed of properly

#### steps

1. Open the custom materials example.
1. Wait for the tileset to load completely.
1. Verify that the stats display 125 geometries, 126 textures, and 1 programs.
1. Switch to "GRADIENT" display.
1. Click "rebuild".
1. Wait for the tileset to completely load.
1. Switch to "DEFAULT" display.
1. Click "rebuild".

#### expected

Verify that the stats display 125 geometries, 126 textures, and 1 programs.

## Verify tileset with additive tiles renders correctly

#### steps

1. Open the kitchen sink example with the no root content tileset by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-no-root-content.json).
1. Set `colorMode` to `RANDOM_COLOR`.

#### expected

Verify that all tiles render on top of each other including the root and that setting the error target and threshold to 0 does not change this. Ensure that raising the error target to the max value will cause deeper tiles to disappear.

## Verify an external tileset loads correctly

#### steps

1. Load `tileset-external.json` in the kitchen sink example.
1. Zoom in and out.
1. Set target error to `0`.

#### expected

Verify the tileset loads correctly and there are no missing chunks or errors in the console.

## Verify the rest of the tileset renders correctly if an external tileset fails to load

#### steps

1. Load `tileset-external-broken.json` in the kitchen sink example [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-external-broken.json).
1. Zoom in and out.
1. Set target error to `0`.

#### expected

Verify that the external tileset does not load but the rest of the tileset continues to work as expected with a gap.

## Verify an external tileset can unload from the cache

#### steps

1. Load `tileset-external.json` in the kitchen sink example [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-external.json).
1. Zoom in and out.
1. Set target error to `0`.
1. Ensure external tileset has loaded by running `tiles.root.children[0].children[0].children` in the console and verifying it's not empty.
1. Set the max depth to `0`, and set min and max cache size to `1` before resetting them to force everything to unload. Check the cache display to ensure it's unloaded.
1. Ensure external tileset is unloaded by `tiles.root.children[0].children[0].children` in the console and verifying it's empty.
1. Raise the max depth again and verify that the external tileset loads once again.

#### expected

Verify all steps happen as written.

## Verify disposing of the tileset removes all sub tile sets

#### steps

1. Load `tileset-external.json` in the kitchen sink example [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-external.json).
1. Zoom in and out to load in tiles.
1. Set target error to `0`.
1. Open render stats display.
1. Wait for all data to load and ensure total geometries is "220".
1. Press "reload" and wiat for all data to load.

#### expected

Verify that the total geometries in the render stats display is still "220".

## Verify tileset raycasting with additive tile sets

#### steps

1. Open the kitchen sink example with the no root content tileset by navigating [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/#../data/tileset-add.json).
1. Set `colorMode` to `RANDOM_COLOR`.
1. Set `maxDepth` to 2 so two layers are displayed on top of eachother.
1. Click the color that represents the root tile and ensure depth is logged as "0".
1. Click a color that represents a child tile and ensure the depth is logged as "1".

#### expected

Verify correct depth is returned when clicking the tiles.
