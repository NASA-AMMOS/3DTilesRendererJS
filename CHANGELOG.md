# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
### Changed
- Increased default `downloadQueue` max jobs from 4 to 10.

## [0.3.41] - 2024.11.07
### Added
- R3F CameraTransition component to r3f export.
- CameraTransitionManager to core.

### Fixed
- Added name field to "UpdateOnChangePlugin".
- CameraTransitionManager: Adjust the calculation for the near plane distance to avoid clipping in some cases.

### Change
- Revert change that would cause the root tiles to "trickle" in over time if the root is empty and uses an "ADD" refinement. Tiles will now only render once a full set of child tiles can be rendered.
- Update "BatchedTilesPlugin" to rely on three.js r170, leverage new copy capabilities.
- TilesRenderer plugins and GLTF Extensions have been moved to `3d-tiles-renderer/plugins` export path.

## [0.3.40] - 2024.10.29
### Added
- I3DMLoader: Add support for EAST_NORTH_UP semantic.
- R3F TilesRenderer: Added `group` property for passing react properties to the root tile set object.
- R3F `<CompassGizmo>` component.

### Changed
- Slightly modified the traversal algorithm to not require loaded content (and therefore for content to exist) in order to trigger child tiles to load.
- GlobeControls: renamed "updateClipPlanes" to "adjustCamera".
- CameraTransitionManager: added "autoSync" and "syncCameras" function.
- GlobeControls: Adjust behavior of zoomed out rotation to keep the grabbed point under the pointer.

### Fixed
- EnvironmentControls: Assign the current camera to the raycaster.
- Typescript definitions for TilesRenderer.
- Case where the closest hit was not returned with "firstHitOnly" raycasting.
- R3F TilesRenderer: Fix case where the tiles renderer context would not trigger an update when options changed.
- UpdateOnChangePlugin: Fix case where tiles would not update correctly if plugin was added after cameras.
- EnvironmentControls: Correctly mark "wheel" event as non-passive.

## [0.3.39] - 2024.10.15
### Added
- `ReorientationPlugin` and `GLTFExtensionsPlugin`.
- Ability to remove plugins via the `unregisterPlugin` function.
- Support for octree subdivision to implicit tiling.
- Initial `BatchedTilePlugin` implementation to examples.
- Initial support for `@react-three/fiber` with component implementations exported as `3d-tiles-renderer/r3f`. See the r3f docs for more information.

### Changed
- LRUCache minSize and maxSize variables to default to 6000, 8000.
- Added `getAttributions` function, deprecated `getCreditsString` function.
- GoogleCloudAuthPlugin: Use the photorealistic tiles url if a user has not provided one.
- GoogleCloudAuthPlugin: Modify the tiles renderer to use recommended settings for Google Photorealistic Tiles by default.
- Deprecated GooglePhotorealisticTilesRenderer.
- Improve EnvironmentControls momementum thresholds so movement stops sooner.

### Fixed
- Case where tile set scale was incorrectly used when computed screenspace error.
- Case where `setTileVisibility` could get called asymmetrically.
- Case where `TilesFadePlugin` would hold on to scene geometry after disposal.

## [0.3.38] - 2024.09.30
### Added
- BatchTable: Added "getPropertyArray".
- GoogleCloudAuthPlugin, CesiumIonAuthPlugin: added "autoRefreshToken" option to enable automatically refreshing the token when requests fail due to timeout.

### Fixed
- Fixed type definition.
- GlobeControls, EnvironmentControls: Account for near and far camera clip distances.
- I3DMLoader: Fix cases where external files may not be loaded correctly.
- Documentation typo: `maxByteSize` -> `maxBytesSize`.
- Documented that LRUCache's `maxByteSize` and `minByteSize` are only compatible with three.js >= r166
- Environment / GlobeControls: Fixed the pivot point mesh appearing when controls are disabled.
- Case where LRUCache could cause tiles to load repeatedly.

## [0.3.37] - 2024.08.27
### Added
- TilesOverlayPlugin: Added support for waiting until textures finish loading to display.
- BatchTable: `count` field to get the number of id / entries.
- I3DMLoader: Added support for `RTC_CENTER` feature.
- TilesRenderer: Added initial support for implicit tiling.
- LRUCache: Support for setting the min and max byte size for the cache which accounts for geometry and texture sizes.
- Plugins: Added "UpdateOnChangePlugin" to the examples folder.
- EnvironmentControls: Added "enableDamping" option for inertial animation.
- Ellipsoid: Added "getEastNorthUpAxes".
- Ellipsoid: Added "getAzElRollFromRotationMatrix" and "getRotationMatrixFromAzElRoll"
- TilesRendererBase: Tiles are now queued and sorted before triggering load to avoid only a single tile set branch loading and filling up the lru cache.

### Changed
- TilesOverlayPlugin: Changed constructor to take options object, instead.
- TilesRenderer: Removed `loadSiblings` option.
- TilesRenderer: Removed `stopAtEmptyTiles` option.
- LRUCache: Tiles continue to be unloaded even when the tiles renderer update function has not been called.
- TilesRenderer: Deprecate "preprocessURL" function.
- Ellipsoid: Renamed "constructLatLonFrame" to "getEastNorthUpFrame".
- Ellipsoid: "getNorthernTangent" function has been deprecated.

### Fixed
- GlobeControls: cases where the camera far clip plane was set too close causing some far tiles to not display.
- GlobeControls: When zooming out the amount that the camera automatically orients is now based in part on zoom amount.
- TilesRenderer: Adjust tile traversal behavior so child tiles of "ADD" refinement are not forced to load.
- GlobeControls: Zoomed-out ellipsoid rotation is now scaled based on camera parameters and ellipsoid size.
- I3DMLoader: `SCALE` and `SCALE_NON_UNIFORM` are now both applied when present.
- I3DMLoader: Instances now work correctly when parent group transforms are applied.
- EnvironmentControls: Fixed case where zoom would not work if the mouse had not been moved.
- TilesRenderer: Fix case where raycasting could throw an error.

## [0.3.36] - 2024.07.25
### Added
- `tiles-load-start` and `tiles-load-end` callback indicating when tile loading has completed finished.
- `camera-add`, `camera-delete`, `update-before`, `update-after` events.
- Initial implementation of plugin system.
- TileCompressionPlugin to examples for lowering memory usage.
- `GoogleCloudAuthPlugin` and `CesiumIonAuthPlugin` to enable fetching data from the associated APIs.
- Added `GooglePhotoRealisticTilesRenderer` class.
- Added support for the `3DTILES_batch_table_hierarchy` extension.

### Fixed
- CameraTransitionManager: Variety of cases relating to negative orthographic camera "near" values.
- GlobeControls: Speed change when transitioning between near and far behavior.
- GlobeControls: Behavior now relies on camera field of view.
- GlobeControls: Zooming out from the horizon no longer spins the globe.
- GlobeControls: Add support for orthographi camera.
- Remove unnecessary matrix instantiation during tiles parse.
- `getBoundingBox` and `getOrientedBoundingBox` returning an incorrect condition when no bounding volume is present.
- Fix case where an incorrect SSE metric was produced when tiles used non-uniform scales with oriented bounding box volumes.
- Fix case where potentially incorrect raycast results were produced when tiles used non-uniform scales with oriented bounding box volumes.
- GLTFStructureMetadata extension exits gracefully if no extension is present.

### Changed
- CesiumIonTilesRenderer: Will immediately load the tile set after resolving credentials.
- Examples FadeTilesRenderer has been changed to a plugin.
- Deprecated `GoogleTilesRenderer` and `CesiumIonTilesRenderer` in favor of using the new authentication plugins.
- Loaders: ".load" function has been renamed to ".loadAsync".
- Deprecated `onLoadTileset`, `onLoadModel`, `onDisposeModel`, and `onTileVisibilityChange` in favor of their event equivalents.
- LRUCache: "unloadPriorityCallback" has been changted to take two tile arguments to sort instead of one.
- DebugTilesRenderer has been deprecated in favor of the "DebugTilesPlugin".
- LRU Cache unload priority function now unloads deepest tiles first, then least recently used, then non-external tile sets.

## [0.3.35] - 2024.06.25
### Fixed
- Lint rules causing build failures.

## [0.3.34] - 2024.06.18
### Added
- Export `EXT_mesh_features` & `EXT_structural_metadata` extensions for glTF.

### Fixed
- Syntax errors causing failure to import in some cases.

## [0.3.33] - 2024.05.31
### Fixed
- Remove logged error when a tile set is aborted.
- Adjusted raycast early exit behavior based on three.js r165.
- EnvironmentControls: fix case where the dragging does not work from below
- Remote glTF textures failing to load.

## [0.3.32] - 2024.05.17
### Added
- EnvironmentControls: Add support for othographic zoom.
- EnvironmentControls: Add "zoom speed" option.
- PNTSLoader: Add `batchTable` to the returned points object.
- Support for improved, early termination raycasting from three.js r165.

### Fixed
- Some cases where the camera jumped and drifted while reorienting the "up" direction.

### Changed
- EnvironmentControls: Changed default rotation speed.
- Use `queueMicrotask` in place of `Promise.resolve()`.

## [0.3.31] - 2024.03.25
### Fixed
- Ellipsoid.getPositionElevation not returning negative elevations.
- EnvironmentControls: Enfoce a minimum elevation when computing horizon distance to ensure a reasonable far clip distance.
- EnvironmentControls: Contructor arguments are no longer required.
- EnvironmentControls: Detach now correctly removes the dom element reference.
- GlobeControls: Functions without setting indices.

### Added
- EnvironmentControls: Add "fallbackPlane" and "useFallbackPlane" members so dragging works when there is no geometry under the mouse.

## [0.3.30] - 2024.03.12
### Fixed
- EnvironmentControls and GlobeControls not zooming into the cursor when offset.

## [0.3.29] - 2024.03.12
### Fixed
- EnvironmentControls and GlobeControls not working with a non-full page element.
- FadeTilesRenderer improperly disposing of tiles causing unloaded textures to be rendered.

## [0.3.28] - 2024.03.11
### Fixed
- Memory leak related to ImageBitmaps not being released on tile disposal.

## [0.3.27] - 2024.03.06
### Fixed
- Fixed credit attribution string for GoogleTilesRenderer to align with requirements.
- Fixed fade events not firing as expected in FadeEventManager.

## [0.3.26] - 2024-02-29
### Fixed
- FadeTilesMixin.deleteCamera now correctly calls the parent function.
- EnvironmentControls now dispatches events on zoom value change.

## [0.3.25] - 2024-02-21
### Changed
- "getBounds" and "getOrientedBounds" functions have been renamed to "getBoundingBox" and "getOrientedBoundingBox".
- GlobeControls will now set the camera near and far values to more tightly encapsuate the set of tiles visible until the horizon, limiting the amount of tiles to load.
- GlobeControls now more intelligently sets the camera "near" value to avoid z fighting.

### Fixed
- Frustum and oriented bounding box functions now more correctly determines intersections instead of producing frequent false positives resulting in more tiles being loaded.

## [0.3.24] - 2024-02-09
### Added
- Support for dispatched events to TilesRenderer and equivelent events for existing `.on*` callbacks.
- EnvironmentControls and GlobeControls.
- Fix inaccuracies in documentation.

## [0.3.23] - 2024-01-09
### Fixed
- Case where Google tiles did not load to a further depth when a tile has no content and no children.

## [0.3.22] - 2023.12.25
### Added
- DebugTilesRenderer: Support for visualizing the load order of tiles

### Fixed
- TilesRendererBase: Error log when using a 1.1-compatible tileset

## [0.3.21] - 2023.09.27
### Added
- PNTSLoader: Support for `CONSTANT_RGBA`, `RGBA`, and `RGB565`.

## [0.3.20] - 2023.06.26
### Added
- `CesiumIonTilesRenderer` for more convenient use of the ion API.
- Frustum check support for OBB bounding volumes resulting in more than 35-45% fewer tiles loading and displaying in some cases when OBB bounding volumes are used.

### Changed
- Consolidate bounding volumes into a common class to simplify implementation.
- Progressively process recursive tileset tiles preventing frame stalls of up to and over 100ms in some cases when many or large child tilesets were loaded.
- GoogleTilesRenderer.setLatLonToYUp now sets X+ to north and Z+ to east

### Fixed
- TilesRenderer.dispose function not working correctly.
- Type declaration file for constants.
- Raycasting not working correctly with "additive" tile refinement.

## [0.3.19] - 2023-06-13
### Fixed
- Case sensitivity when dealing with file formats.
- Race condition when setting the transformation of gltf files.
- Case where internal tilesets were not disposed of properly when calling "dispose".
- Incorrect calculation of geometric error when spheres are available.
- Support for rayasting tiles with sphere bounding volumes.
- Add "constructLatLonFrame" and "getNorthernTangent" to Ellipsoid class.

### Added
- `getBounds` and `getOrientedBounds` now return the AABB of a sphere if a tileset bounding box is not available.
- `GoogleTilesRenderer` for rendering Google's Photorealistic 3D Tiles

## [0.3.18] - 2023-05-13
### Added
- Support for DRACO-compressed PNTs files.

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
- `stopAtEmptyTiles` which defaults to true so tilesets correctly stop traversal at empty tiles.

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
