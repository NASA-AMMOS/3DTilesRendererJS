# 3d-tiles-renderer-js

_IN PROGRESS_

In progress three.js implementation of the [3D Tiles format](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/).

The renderer supports a limited subset of the spec for the moment. See [Issue #15](https://github.com/NASA-AMMOS/3DTilesRendererJS/issues/15) for information on which features are not yet implemented. 

**In Progress Features**
- Multicamera support
- Fast raycast support
- Travis integration
- ThreeTilesRenderer API
- Performance

# Use

```js
// TODO
```

# API

## ThreeTilesRenderer

### .group

```js
group : Group
```

### .displayBounds

```js
displayBounds = false : Boolean
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
constructor( url : String, cameras : Camera | Array<Camera>, renderer : WebGLRenderer )
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
