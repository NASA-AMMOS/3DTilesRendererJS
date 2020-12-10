# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
### Added
- Support for external tile sets.

### Fixed
- Add a readable message for when console.assert fails.
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
