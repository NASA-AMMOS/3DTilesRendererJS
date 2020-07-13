# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
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
