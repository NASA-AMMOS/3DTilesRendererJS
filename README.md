# 3d-tiles-renderer-js

_IN PROGRESS_

[![travis build](https://img.shields.io/travis/com/NASA-AMMOS/3DTilesRendererJS/master.svg?style=flat-square)](https://travis-ci.com/NASA-AMMOS/3DTilesRendererJS)
[![lgtm code quality](https://img.shields.io/lgtm/grade/javascript/g/NASA-AMMOS/3DTilesRendererJS.svg?style=flat-square&label=code-quality)](https://lgtm.com/projects/g/NASA-AMMOS/3DTilesRendererJS/)

In progress three.js implementation of the [3D Tiles format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/).

The renderer supports a limited subset of the spec for the moment. See [Issue #15](https://github.com/NASA-AMMOS/3DTilesRendererJS/issues/15) for information on which features are not yet implemented.

See it in action [here](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/)!

**In Progress Features**
- Multicamera support
- Travis integration
- Performance

# Use

```js
import { TilesRenderer } from '3d-tiles-renderer';

// ... initialize three scene ...

const tilesRenderer = new TilesRenderer( './path/to/tileset.json' );
tilesRenderer.setCamera( camera );
tilesRenderer.setResolutionFromRenderer( camera, renderer );
scene.add( tilesRenderer.group );

renderLoop();

function renderLoop() {

	requestAnimationFrame( renderLoop );

	// The camera matrix is expected to be up to date
	// before calling tilesRenderer.update
	camera.updateMatrixWorld();
	tilesRenderer.update();
	renderer.render( camera, scene );

}


```

# API

## TilesRenderer

### .group

```js
group : Group
```

### .errorTarget

```js
errorTarget = 6 : Number
```

### .errorThreshold

```js
errorThreshold = Infinity : Number
```

### .maxDepth

```js
maxDepth = Infinity : Number
```

### .loadSiblings

```js
loadSiblings = true : Boolean
```

### .lruCache

```js
lruCache = new LRUCache() : LRUCache
```

_NOTE: This cannot be set once [update](#update) is called for the first time._

### .downloadQueue

```js
downloadQueue = new PriorityQueue : PriorityQueue
```

_NOTE: This cannot be set once [update](#update) is called for the first time._

### .parseQueue

```js
parseQueue = new PriorityQueue : PriorityQueue
```

_NOTE: This cannot be modified once [update](#update) is called for the first time._

### .constructor

```js
constructor( url : String )
```

### .update

```js
update() : void
```

### .getBounds

```js
getBounds( box : Box3 ) : void
```

### .raycast

```js
raycast( raycaster : Raycaster, intersects : Array ) : void
```

### .hasCamera

```js
hasCamera( camera : Camera ) : boolean
```

### .setCamera

```js
setCamera( camera : Camera ) : boolean
```

### .deleteCamera

```js
deleteCamera( camera : Camera ) : boolean
```

### .setResolution

```js
setResolution( camera : Camera, resolution : Vector2 ) : boolean
setResolution( camera : Camera, x : number, y : number ) : boolean
```

### .setResolutionFromRenderer

```js
setResolutionFromRenderer( camera : Camera, renderer : WebGLRenderer ) : boolean
```

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
