# 3d-tiles-renderer-js

_IN PROGRESS_

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
tilesRenderer.camera = camera;
tilesRenderer.setResolutionFromRenderer( renderer );
scene.add( tilesRenderer.group );

function renderLoop() {

	// ...

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
errorThreshold = 6 : Number
```

### .maxDepth

```js
maxDepth = Infinity : Number
```

### .loadSiblings

```js
loadSiblings = true : Boolean
```

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

### .setResolutionFromRenderer

```js
setResolutionFromRenderer( renderer : WebGLRenderer )
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
