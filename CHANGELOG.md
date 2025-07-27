# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.4.14] - Unreleased
### Added
- Support for WMTS image overlays.
- Added WMTSTilesPlugin for generating an ellipsoid.

## [0.4.13] - 2025.07.27
### Added
- XYZTilesPlugin, XYZImageOverlay: Add support for inverted Y tile order, ability to specify bounds.

### Fixed
- ImageFormatPlugin: Fixed case where an error could throw if a texture was loaded twice in minor corner cases.
- GoogleCloudAuthPlugin: Use the default load queue parameters.
- GoogleCloudAuthPlugin: Fix issue relating to assigned auth url.
- TileCompressionPlugin: Fix transform not working correctly when model is rotated, scaled.
- GlobeControls: Fix case where the pivot point visualization was being inconsistently shown when zoomed out.
- TilesRenderer: Prioritize tile downloads by tile error relative to error target.
- GoogleCloudAuthPlugin, CesiumIonAuthPlugin: Ensure the new authentication and session token are used when an initial request fails when "autoRefreshToken" is enabled.
- GlobeControls, EnvironmentControls: Improve the controls behavior when dragging off of the canvas or over other dom elements.
- TilesRenderer: Improved some traversal logic, corrected behavior when encountering empty tiles.

### Changed
- GlobeControls: Dragging operations now end when dragging off the globe.
- PriorityQueue: No longer requires a sort callback. If set to "null" then items are processed in the order added.

## [0.4.12] - 2025.07.13
### Added
- `3d-tiles-renderer/core` & `3d-tiles-renderer/three` export for dedicated files.
- `3d-tiles-renderer/core/plugins` & `3d-tiles-renderer/three/plugins` export for dedicated plugins.
- Added `EnforceNonZeroErrorPlugin`.
- ImageOverlayPlugin: Add support for splitting tiles to match image tile detail.
- ImageOverlayPlugin: Planar projection now only works when the projection is within the range 0, 1 along the z-projection axis.
- ImageOverlayPlugin: Add support for adding downloads to the download queue, tracking used GPU memory in the LRUCache.

### Changed
- TilesRenderer: Increased default queue sizes from 1 to 5 for parse queue, 10 to 25 for download queue.

### Fixed
- R3F TilesAttributionOverlay not functioning on non-HTTPS domains.
- Support for React 19 while maintaining React 18 support.
- QuantizedMeshPlugin: Fixed case where availability metadata was not interpreted correctly.
- Fixed case where "screenspace error" could be calculated as "NaN" when the distance to the tile and geometricError are 0.
- UpdateOnChangePlugin: Fix events not being disposed of properly.
- QuantizedMeshPlugin: Only parse a mesh if the extension is "terrain".
- ImageOverlayPlugin: Correctly cancel image tile loading when removing an overlay.
- TilesRenderer: Fix case where load events could be fired on tiles after they had been disposed when the cache is full.
- ImageOverlayPlugin: Reduced the epsilon used for calculating which tiled images need to be loaded to avoid seams.

## [0.4.11] - 2025.07.01
### Added
- Add "ImageOverlayPlugin".
- DebugTilesRenderer: Added "unlit" option.
- GoogleCloudAuthPlugin: Added support for creating a session that supports loading 2d map tiles.
- Ellipsoid: Added "getOrientedEastNorthUpFrame", "getObjectFrame", "getCartographicFromObjectFrame" functions.
- ReorientationPlugin: Add suppor for setting azimuth, elevation, roll

### Fixed
- TilesRendererBase: Fixed plugins not being disposed of correctly.
- GoogleCloudAuthPlugin: Throw an error when the tile root fails to load.
- Fixed some type definitions.
- GlobeControls: Adjust the perspective camera.far calculation to better limit loaded tiles.
- DebugTilesPlugin: Fix case where the plugin could not be disabled before registration.
- Fix case where properties would fail to add if they looked like events with an "on" prefix.
- Simplify the TileFlatteningPlugin implementation.
- ReorientationPlugin: Fix plugin disposal not removing an event correctly.
- ReorientationPlugin: Fix plugin not working if added after TilesRenderer initialization.
- TopoLinesPlugin: Ensure the plugin can be added after TilesRenderer initialization.
- TopoLinesPlugin, TilesFadePlugin, ImageOverlayPlugin: Ensure plugins are resilient to being removed and added again.
- R3F: Fixed case where plugins may not have been able to register before the first call to TilesRenderer.update.

### Changed
- Ellipsoid: Deprecated "getAzElRollFromRotationMatrix", "getRotationMatrixFromAzElRoll", "getFrame" functions.
- GlobeControls, EnvironmentControls: Deprecate "setTilesRenderer" function in favor of "setScene" and "setEllipsoid" functions.
- R3F GlobeControls, EnvironmentControls: Add "ellipsoid" and "ellipsoidGroup" properties.

## [0.4.10] - 2025.05.31
### Fixed
- Fixed calls to `updateWorldMatrix` causing the matrixWorldInverse field to become out of sync.
- Loader type definitions now extend "LoaderBase".
- Export QuantizedMeshPlugin from plugins.
- Moved "optionalDependencies" to "peerDependencies" with an optional flag to avoid quirks with the optional dependencies field.
- Make QuantizedMeshPlugin more robust to missing fields in layer.json.
- TileFlatteningPlugin: Fixed disposal throwing an error.
- Change `load-error` event field from `uri` to `url` as documented.
- Fixed type definitions for some events.
- B3DM, I3DM, PNTS Loaders: Fixed case where RTC_CENTER feature would not be parsed correctly.
- Re-add "load-tile-set" event when child tile sets are loaded.
- Re-add url to "load-tile-set" event.
- TMSTilesPlugin: Add support for limited bounds.

### Added
- Ability to resolve to any file in "./src".
- QuantizedMeshPlugin: Add support for attributions.
- QuantizedMeshPlugin: Add support for "metadataAvailability".
- QuantizedMeshPlugin: Add support for auto-filling child tiles from parent data when not present.
- QuantizedMeshPlugin: Add support for auto-calculating skirth length.

### Changed
- QuantizedMeshPlugin, Image Plugins: Remove internal, custom queue for generating children in favor of TilesRenderer's new process queue.

## [0.4.9] - 2025.05.07
### Fixed
- Structural Metadata: Fixed case where accessor properties do not match the class definition.
- Fix type definitions for LRUCache.
- Implicit Subtree files being loaded with incorrect headers.
- Ambiguous typing.
- Correctly export `TilesFlatteningPlugin`.
- Types: Added file extensions to enable support for older node versions.
- TilesRenderer: Removed implicit use of "devicePixelRatio" when setting camera resolution to ensure more consistent error target calculations across devices.
- EnvironmentControls: Adjust event listeners to exit early if controls are disabled.
- R3F TilesRenderer Component: Fixed case where tiles would not load when using on demand rendering without moving the camera (via needs-update event).

### Added
- QuantizedMeshPlugin: A plugin for loading quantized mesh files.
- TilesFlatteningPlugin: Added a threshold option to `addShape`.
- TilesRenderer: Added "needs-update" event.
- R3F TilesPlugin: Added support for deep field property assignment.

### Changed
- Internal "force-rerender" function renamed to "needs-render".
- TilesRenderer: Move check for cameras after update traversal to enable loading the root tile set file without a camera defined.

## [0.4.8] - 2025.04.07
### Fixed
- TilesRenderer: No longer logs a warning if no cameras are present and a custom plugin supports tile error.
- Type definition errors.
- R3F EastNorthUpFrame: frame will be positioned correctly regardless of parent.
- TilesRenderer: Fixed screen space error being calculated incorrectly with multiple cameras.
- EnvironmentControls: Fixed shift key not working as expected.
- Fixed error caused by loading a glTF file with no scenes.
- GLTF Metadata Extensions: Fix case where an error would be thrown when non-mesh nodes are present.
- Fixed case where tile sets with implicit tiling would not be loaded correctly if an external availability buffer was used.
- Asynchronously process child tiles to avoid processing stalls.
- CesiumIonPlugin: Forward "autoRefreshToken" value to GoogleCloudAuthPlugin.

### Added
- R3F CompassGizmo: Support for X & Y margin for CompassGizmo.
- CameraTransitionManager: Expose "alpha" via the change event and class member.
- Export "TilesRendererEventMap" typescript type.
- Add support for R3F types.
- Add "TileFlatteningPlugin".

## [0.4.7] - 2025.03.03
### Added
- GlobeControls: If no raycast intersection is fund then fallback to intersecting the tile set globe.
- EnvironmentControls, GlobeControls: Fix inertia calculations for orthographic cameras.
- R3F EastNorthUpFrame: Add support for passing the ellipsoid in directly.
- TilesRenderer.group: Added "matrixWorldInverse" field.
- Add "LoadRegionPlugin".

### Fixed
- Fix case where the environment and globe controls can have residual inertia after stopping the mouse.
- Image Format Plugins: Fix case where tiles may not cause update on first load resulting in no tiles rendered.

### Changed
- Deprecated "TilesRenderer.setLatLonToYUp" function.
- Deprecated "TilesRenderer.errorThreshold" option.
- Deprecated "TilesRenderer.optimizeRaycast" option.
- Use "TilesRenderer.group.matrixWorldInverse" across src files to reduce matrix invert operations.

## [0.4.6] - 2025.02.21
### Added
- R3F TilesRenderer: Add "enabled" field

### Fixed
- CesiumIonAuthPlugin: Fix the plugin not being disposed of properly.
- EnvironmentControls: Fix missing pivot mesh ring when rotating the camera.
- Fix GLTF Metadata plugin not returning matrix values correctly.
- TMS, XYZ Plugins: Fix case where texture would be distorted due to incorrect vertex placement when using mercator projection.
- Case where TilesRenderer.root was not initialized before the "load-tile-set" event was fired.
- R3F TilesRenderer: Update the tile set when a tile set is loaded.
- ImageFormatPlugins: Fix plugin so it does not preclude updates incorrectly.
- R3F TilesRenderer: Prevent reinstantiation of all child plugins, objects on options change.
- R3F EastNorthUpFrame: Automatically update based on ellipsoid updates.
- EnvironmentControls: Use a zoom approach that is (hopefully) more normalized across platforms.

## [0.4.5] - 2025.02.14
### Added
- DeepZoomImage plugin support.
- TMS tiles plugin support.
- XYZ tiles plugin support.
- Add ability to display TMS, XYZ tiles as an ellipsoid or plane.
- R3F: "SettledObject" and "SettledObjects" components.
- BatchedTilesPlugin: Add "textureSize" option.

### Fixed
- EnvironmentControls: Fixed circle mesh not hiding when zooming on mobile.
- BatchedTilesPlugin: Fix case where image bitmaps would not be disposed of correctly when discarding data.
- BatchedTilesPlugin: Fix small 32-bit floating point math precision problems causing small offsets for globe tiles.
- Plugins: Fix case where a plugin was not inserted based on priority correctly.
- EnvironmentControls, GlobeControls: Scale intertial animation based on distance to drag point.

## [0.4.4] - 2025.01.24
### Added
- `load-error` events when model, tile set, and API token requests fail to fetch or parse.
- CanvasDOMOverlay: Add support for "ref".
- CameraTransitionManager: Add `easeFunction` setting.
- CameraTransitionManager: Add option to pass delta time to the update function.

### Fixed
- Improved the behavior of `loadProgress` so it "bounces" less during loading by queueing all tiles load immediately (other than cases with external tile sets).
- Moved the dispatch location of "load-model", "tiles-load-start", and "tiles-load-end" so the behavior is more consistent.

## [0.4.3] - 2025.01.19
### Added
- Updated types for EnvironmentControls and GlobeControls.
- TilesAttributionOverlay: Added "generateAttributions" callback for generating child elements.
- CameraTransitionManager: Added "toggle" event.
- CameraTransitionManager: Added support for rotation interpolation.
- Ellipsoid: Added "getFrame" function.

### Changed
- Moved "visibleTiles" and "activeTiles" sets to the TilesRendererBase class.
- EnvironmentControls: `getPivotPoint` function now defaults to the nearest raycast point if the last interacted point is offscreen.

### Fixed
- CanvasDOMOverlay is now correctly positioned at the same spot as the canvas.
- UnloadTilesPlugin: Fixed incorrect reference to `visibleSet` rather than `visibleTiles`.
- R3F EnvironmentControls, GlobeControls: Add support for "ref", event props.

## [0.4.2] - 2025.01.14
### Fixed
- Case where an evicted tile could still continue to parse, causing an incorrect "loadProgress" value.

## [0.4.1] - 2025.01.14
### Added
- PNTSLoader: Add support for normals, quantized normals.
- TilesRenderer: Support for 3DTILES_ELLIPSOID extension.
- Types: Added types for CameraTransitionManager, GlobeControls, EnvironmentControls.
- "inCache" field in TilesRenderer.stats object representing number of tiles in the lru cache for that renderer.
- TilesRenderer: added "loadProgress" field.

### Fixed
- TilesRenderer update no longer implicitly marks all tiles owned by other tiles renderers as unused. All tiles renderers sharing an LRUCache no longer must have their "update" functions called on the same frame.
- Types: Fixed types for all plugins options to be appropriately marked as "optional".
- Case where ImageBitmap data may not have been disposed in rare situations.

### Changed
- Remove "loadIndex" fields for cancelling redundant loads in favor of an abort signal.
- Removed gltf extension exports from core. Use the plugins export, instead.
- TilesRenderer: `CESIUM_RTC` glTF extension is no longer automatically supported. Use the `GLTFExtensionsPlugin`, instead.
- Removed `GLTFExtensionLoader`.

## [0.4.0] - 2024.12.25
### Changed
- Minimum three.js version is now r166
- Remove deprecated functions.
- Moved "BatchedTilesPlugin" to the "plugins" subpackage.
- Add support for BatchedTilesPlugin to FadeTilesPlugin.

## [0.3.46] - 2024.12.24
### Fixed
- Types: Convert types of use non-wrapper types.
- Types: Adjust GLTF Plugin classes to extend appropriate type.
- BatchedMeshPlugin: Prevent empty groups from being added for each tile when using BatchedMeshPlugin.
- TilesRenderer: Fixed event targets not being set to the tiles renderer.

### Changed
- TilesFadePlugin: TilesRenderer will now fire visibility hidden events once the tile is completely faded out.
- TilesFadePlugin: Fading tiles are now present in the tile set root rather than a sub group.
- TileCompressionPlugin: Change the defaults to not automatically compress normals, uvs to avoid artifacts.
- GlobeControls: Orthographic "near" margin around the globe has been increased from 10% to 25% of the large ellipsoid radius value.

### Added
- Added "priority" field to plugins to ensure correct execution order. `TilesCompression` and `BatchedMesh` plugin will always run first.
- Added `UnloadTilesPlugin`.
- Plugins: Add support for "setTileVisible" plugin callbacks.
- Add names to some plugins that were missing them.
- GLTFExtensionsPlugin: Add support for MeshoptDecoder.
- TilesRenderer: Add types for events.
- GlobeControls: Added `nearMargin` and `farMargin` percentages for controlling camera distances.
- DebugTilesPlugin: `enabled` field to DebugTilesPlugin to enable / disable the debug features.
- DebugTilesPlugin: Added support for `displayParentBounds`.

## [0.3.45] - 2024.12.13
### Fixed
- CameraTransition R3F Component: Allow for not passing in a "mode".
- CameraTransition R3F Component: Allow for passing options arguments into the component.
- CameraTransition R3F Component: Fix on demand rendering not working correctly.
- Export new B3DM, I3DM, and PNTS types.

## [0.3.44] - 2024.12.07
### Fixed
- TilesRenderer: Root tile load state not getting set correctly.

## [0.3.43] - 2024.12.07
### Fixed
- TilesFadePlugin: Adjust "TilesFadePlugin" such that it causes are rerender for r3f.
- EnvironmentControls: Fix orthographic camera zoom so it does not pop if too close to a surface.
- CesiumIonAuthPlugin and GoogleCloudAuthPlugin: The plugins now automatically retry root tile if it hasn't been loaded upon add.

## [0.3.42] - 2024.12.02
### Changed
- Increased default `downloadQueue` max jobs from 4 to 10.
- Move TilesFadePlugin, TileCompressionPlugin, UpdateOnChangePlugin to `3d-tiles-renderer/plugins`.
- Move ReorientationPlugin, GLTFExtensionsPlugin to `3d-tiles-renderer/plugins`.

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
