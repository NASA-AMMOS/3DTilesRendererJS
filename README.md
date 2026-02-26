# 3d-tiles-renderer

[![npm version](https://img.shields.io/npm/v/3d-tiles-renderer.svg?style=flat-square)](https://www.npmjs.com/package/3d-tiles-renderer)
[![build](https://img.shields.io/github/actions/workflow/status/NASA-AMMOS/3DTilesRendererJS/node.js.yml?style=flat-square&label=build&branch=master)](https://github.com/NASA-AMMOS/3DTilesRendererJS/actions)

![](./images/header-mars.png)

JavaScript renderer implementation for the [3D Tiles format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/) with support for both **Three.js** and **Babylon.js**. The renderer supports most of the 3D Tiles spec features with a few exceptions. For a list of available data sets and generation tools see the [3d Tiles resources](https://github.com/CesiumGS/3d-tiles/blob/main/RESOURCES.md) list.

If a tileset or geometry does not load or render properly please make an issue! Example data is needed for adding and testing features. See the [Feature Complete Milestone](https://github.com/NASA-AMMOS/3DTilesRendererJS/milestone/1) for information on which features are not yet implemented.

# Examples

The following examples use **Three.js**. Babylon.js demos are also available for [Mars](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/babylonjs/mars.html) and [Google Photorealistic Tiles](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/babylonjs/googleMapsAerial.html).

See the [Three.js usage guide](./USAGE.md) or [Babylon.js usage guide](./src/babylonjs/renderer/README.md) for setup details with each engine.

| Example | Description |
| --- | --- |
| **Core** | |
| [Dingo Gap Mars](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/mars.html) | Multiple tilesets |
| [Kitchen Sink](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/index.html) | All options and features |
| [VR](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/vr.html) | Rendering in VR |
| **External Tiles Providers** ¹ | |
| [Cesium Ion 3D Tiles](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/ionExample.html) | Standard Cesium Ion tileset |
| [Cesium Ion Lunar](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/ionLunar.html) | Lunar surface tiles |
| [Cesium Ion Mars](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/ionLunar.html?mars) | Mars surface tiles |
| [Google Photorealistic](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/googleMapsAerial.html) | Google Photorealistic Tiles |
| [Google Globe](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/googleMapsExample.html) | Google Globe Tiles |
| **Customization** | |
| [Custom Material](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/customMaterial.html) | Using a custom material |
| [Offscreen Shadows](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/offscreenShadows.html) | Shadows from offscreen tiles |
| [Texture Overlays](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/landformSiteOverlay.html) | Alternate texture overlays |
| **Plugins** | |
| [Metadata](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/metadata.html) | Tile metadata |
| [Fade Transition](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/fadingTiles.html) | Tile LoD fade transition |
| [Deep Zoom](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/deepZoom.html) | Deep Zoom Image format |
| [TMS / XYZ](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/mapTiles.html) | TMS, XYZ map tiles |
| [WMTS](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/wmtsTiles.html) | WMTS map tiles |
| [WMS](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/wmsTiles.html) | WMS map tiles |
| [Quantized Mesh](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/quantMeshOverlays.html) | Quantized mesh with overlays |
| [Load Region](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/loadRegion.html) | Loading tiles in region volumes |
| [GeoJSON](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/three/geojson.html) | GeoJSON overlays |

¹ Requires a [Google Tiles API Key](https://developers.google.com/maps/documentation/tile/3d-tiles) or [Cesium Ion API Key](https://cesium.com/platform/cesium-ion/)


# Getting Started

## Installation

```
npm install 3d-tiles-renderer --save
```

## Usage

- [Three.js](./USAGE.md): Three.js renderer setup examples, custom materials, DRACO, Cesium Ion, and more
- [Babylon.js](./src/babylonjs/renderer/README.md): Babylon.js renderer setup, usage, and limitations
- [React Three Fiber](./src/r3f/README.md): R3F components for 3D Tiles 

## API 
See [API Reference](./API.md): TilesRenderer, PriorityQueue, LRUCache, and BatchTable API docs

## Plugins
See [Plugins](./PLUGINS.md): GLTFLoader extension plugins, TilesRenderer plugins, and extra classes



# LICENSE

The software is available under the [Apache V2.0 license](LICENSE).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
