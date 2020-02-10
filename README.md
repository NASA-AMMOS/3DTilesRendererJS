# 3d-tiles-renderer-js

In progress three.js implementation of the [3D Tiles format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/).

## Unsupported Features

### Model Formats

- [i3dm format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Instanced3DModel/README.md)
- [pnts format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/PointCloud/README.md)
- [cmt format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/Composite/README.md)

### B3DM Features

- Per batched feature metadata extraction
- Individual feature access, selection, and updates
- Individual feature transform and position

### Tileset Features

- [Region](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#region) bounding volume support
- [Viewer request volume](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#viewer-request-volume)
- [Additive refinement](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#additive)

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE.txt).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged. This software may
be subject to U.S. export control laws. By accepting this software,
the user agrees to comply with all applicable U.S. export laws and
regulations. User has the responsibility to obtain export licenses,
or other export authority as may be required before exporting such
information to foreign countries or providing access to foreign
persons. Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
