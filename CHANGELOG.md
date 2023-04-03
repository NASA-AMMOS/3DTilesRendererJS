# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.3.17] - 2023-04-03
### Fixed
- Case where raycasting could return an incorrect result when `firstHitOnly` was true.

## [0.3.16] - 2022-11-11
### Fixed
- Incorrect internal import statement.

## [0.3.15] - 2022-11-09
### Fixed
- Incorrect type definitions.

### Added
- Export for glTF CESIUM_RTC extension.

## [0.3.14] - 2022-09-26
### Fixed
- Removed unused exports.


## [0.3.13] - 2022-09-26
### Added
- Classes for Ellipsoid and EllipsoidRegion.
- DebugTilesRenderer: Added "displayRegionBounds" flag.
- Support for region bounds by converting the volumes into sphere and box bounds.

## [0.3.12] - 2022-08-26
### Fixed
- B3DMLoader: regression causing RTC_CENTER to not be respected.

### Added
- Support for GLTFLoader Cesium_RTC extension.

## [0.3.11] - 2022-07-04
### Added
- Support for determining tile format based on magic bytes.

### Fixed
- Small fixes to the `dispose` function.
- Re-add support for relative tile urls.

## [0.3.10] - 2022-07-02
### Added
- `resetFailedTiles` to enable retry tile downloads that failed.

### Fixed
- Support for loading absolute URIs.
- Fix the application of the tile "up" axis adjustments.

## [0.3.9] - 2022-03-28
### Fixed
- Incorrect argument order to `FeatureTable.getData`

## [0.3.7] - 2022-01-29
### Fixed
- ensuring the working path included a "/" at the end when generating new file paths for the GLTFExtension and B3DM loaders. 

## [0.3.6] - 2022-01-29
### Fixed
- "onPreprocessUrl" is now called for initial Tileset URL.

## [0.3.5] - 2022-01-06
### Added
- `TilesRenderer.onTileVisibilityChange` callback.
- Support for GLTF in tilesets (`3DTILES_content_gltf` extension).

### Changed
- Improved type definitions.
- `PNTSLoader.parse` now returns a promise.
- All model loaders on inherit from a common type.

## [0.3.4] - 2021-11-15
### Added
- PriorityQueue: Added `schedulingCallback` to afford flexibility in job scheduling callback for scenarios where `requestAnimationFrame` will not work, such as with WebXR.

### Fixed
- `autoDisableRendererCulling` incorrectly applying the inverse of the documented effect.
- Screen space error calculations now use the camera projectionMatrix rather than camera type to determine frustum type.

## [0.3.3] - 2021-09-08
### Added
- Support for embedded tileset / tile geometry URLs with hashes, search query parameters.

## [0.3.2] - 2021-09-02
### Changed
- DebugTilesRenderer: Bounding boxes now colored down the tree based on depth.
- DebugTilesRenderer: "MeshStandardMaterial" is now used instead of "MeshBasicMaterial" for debugging.
- TilesRenderer: add `getBoundingSphere` function.

### Added
- DebugTilesRenderer: "RANDOM_NODE_COLOR" visualization setting.
- Names for various tile objects.
- DebugTilesRenderer: Added `getDebugColor` function for adjusing the debug visualization colors.
- Support for computing screen space error for tiles that had sphere bounds but no box bounds.
- DebugTilesRenderer: Added `customColorCallback` and `CUSTOM_COLOR` mode for custom debug coloring.

### Fixed
- I3DMLoader: Fixed embedded absolute URLs not working correctly.
- TilesRenderer: "getBounds" function throwing an error if no bounding box is present on the tileset.

## [0.3.1] - 2021-07-28
### Fixed
- Case where tiles that were outside of the camera frustum would be loaded with a higher priority.
- Case where a single tiles renderer tiles would always be loaded with a higher priority.
- Case where bounding boxes with one dimension of 0 would not compute the distance to camera correctly.

## [0.3.0] - 2021-07-24
### Added
- `path-browserify` dependency explicitly rather than relying on implicit polyfills for `path` package.

### Changed
- `PriorityQueue.priorityCallback` now takes two arguments.
- The default priority sort now accounts for most recently used tiles, screenspace error, and distance to the camera.
- `TilesRenderer.calculateError` no longer returns a value but is now expected to set `__error` and `__distanceToCamera` on the tile itself.

### Fixed
- `TilesRendererBase.preprocessURL` types definition.

## [0.2.11] - 2021-06-03
### Fixed
- PNTS files incorrectly having a GLTF rotation adjustment applied.

## [0.2.10] - 2021-04-15
### Added
- `TilesRenderer.optimizeRaycast` option to disable overriding the raycast function of loaded tiles.

### Changed
- Added "sideEffects: false" to package.json.

### Fixed
- Bounding box visualization not displaying correctly with `DebugTilesRenderer` when the bounds have a width of 0 in one dimension.

## [0.2.9] - 2021-03-03
### Added
- `onLoadTileSet` to the typescript definitions file.

### Fixed
- Feature table attributes like `RTC_CENTER` not being correctly applied to loaded tile geometry.
- `B3DMLoader.load` not correctly resolving with a model.

### Changed
- String decoding to use `TextDecoder`.

## [0.2.8] - 2021-02-26
### Fixed
- Pass fetch options to B3DMLoader.
- Set working path for loaders from CMPTLoader, TilesRenderer callback.
- Adjust loader handler in examples and README to provide GLTFLoader directly.

## [0.2.7] - 2021-02-09
### Added
- Add warnings if unsupported feature semantics are detected for I3DM and PNTS files
- Support for I3DM rotation, scale features.

### Fixed
- A case where I3DM instances could have an incorrect transformations by respecting existing Mesh transformations when converting them to InstancedMeshes.

### Changed
- Make CMPTLoader group child order consistent between loads.

## [0.2.6] - 2021-02-03
### Fixed
- I3DM files not correctly loading external gltf files.

## [0.2.5] - 2021-01-17
### Fixed
- Incorrect use of `multiply` when computing world transformations resulting in incorrect positioning of tiles when non identity transformations are used.

## [0.2.4] - 2021-01-16
### Fixed
- Feature and Batch Tables unnecessarily retaining full file buffer references.

## [0.2.3] - 2020-12-30
### Added
- `getOrientedBounds` function to `TilesRenderer`.
- `preprocessURL` function to `TilesRenderer`.

## [0.2.2] - 2020-12-23
### Fixed
- Incorrectly removing the implicit y-up to z-up GTLF transformation.

## [0.2.1] - 2020-12-15
### Added
- Support for external tile sets.
- B3DM support for RTC_CENTER.

### Fixed
- Add a readable message for when console.assert fails.
- Add url information to log when tile load fails.
- Jittering with I3DM files when instances are positioned at large scales.

## [0.2.0] - 2020-12-02
### Changed
- Compatible three.js version to v0.123.0.

## [0.1.7] - 2020-11-09
### Changed
- `PriorityQueue` to wait a frame to schedule new tasks instead of using `Promise.resolve` so tasks will only be started once per frame.

## [0.1.6] - 2020-10-08
### Added
- `batchTable` and `featureTable` fields onto loaded B3DM, I3DM, and PNTS scene objects directly.
- `stopAtEmptyTiles` which defaults to false so tilesets correctly stop traversal at empty tiles.

### Changed
- Tileset traversal now correctly stops at empty tiles if they do no meet the SSE requirement. Previous behavior can be retained for now by settings `stopAtEmptyTiles` to `false`.

### Fixed
- Typescript declaration files for `CMPT`, `I3DM`, and `PNTS` loaders.

## [0.1.5] - 2020-08-21
### Added

- `manager` field to `TilesRenderer` to enable support for DRACO decompression.
- `TilesRenderer.onLoadTileSet` callback function.
- Support for "ADD" tile refinement.

### Fixed

- `CMPTLoader` not importing `I3DMLoader`.
- A case where if the tile at depth `maxDepth` was empty nothing would be rendered.
- A case where an error was thrown if a mid tile had no content.

## [0.1.4] - 2020-07-17
### Added

- `TilesRenderer.dispose` function to completely dispose of all loaded geometry, materials, and textures in the scene when the renderer is no longer needed.
- `TilesRenderer.onDisposeModel` function which is called when a tile model is disposed of from the cache.

### Fixed

- Case where the url protocol was converted to use a single slash instead of two when loading a model.
- Corner case where an error was thrown if the tileset was dragged off screen out of camera view.

## [0.1.3] - 2020-07-12
### Added

- Basic support for CMPT, PNTS, and I3DM file formats.
- `autoDisableRendererCulling` field to `TilesRenderer`.
- A count of the amount of failed tile content loads to `TilesRenderer.stats`.

### Fixed

- Failed tileset downloads being indefinitely retried.
- Tile content stats not being correctly updated if a tile failed to load.
- Not propagating image load errors.
- DebugTilesRenderer using a different color for every submesh in a tile. Now a single color is used for every submesh in a tile.
- Tiles not rendering if an empty tile is encountered.
- Child tiles not rendering if a parent tile content failed to load.

### Changed

- Improved `update` function performance by deferring LRUCache array update.

## [0.1.2] - 2020-06-08
### Changed

- License text in README to remove unnecessary copy.


## [0.1.0] - 2020-05-29

- Initial release.
