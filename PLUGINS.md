Documentation for addons provided by the project and in the examples folder.

Plugin documentation has been moved to the [plugins directory](./src/three/plugins/README.md).

# Controls

## EnvironmentControls

### .enabled

```js
enabled = true : boolean
```

Whether the controls are enabled and active.

### .enableDamping

```js
enableDamping = false : boolean
```

Flag indicating whether residual inertial animation is played after interaction finishes.

### .constructor

```js
constructor(
	scene = null : Scene,
	camera = null : Camera,
	domElement = null : DomElement,
)
```

Takes the scene to raycast against for click events, the camera being animated, and the dom element to listen for clicks on.

### .attach

```js
attach( domElement : DomElement ) : void
```

The dom element to attach to for events.

### .detach

```js
detach() : void
```

Detaches from the current dom element.

### .setCamera

```js
setCamera( camera : Camera | null ) : void
```

Sets the camera the controls are using.

### .setScene

```js
setScene( scene : Object3D | null ) : void
```

The scene to raycast against for control interactions.

### .update

```js
update( deltaTime = null ) : void
```

Updates the controls. Takes a delta time value in seconds to normalize inertia and damping speeds. Defaults to the time between call to the function.

### .dispose

```js
dispose() : void
```

Detaches all events and makes the controls unusable.

### .getPivotPoint

```js
getPivotPoint( target : Vector3 ) : target
```

Gets the last used interaction point.

### .adjustCamera

```js
updateCameraClipPlanes( camera : Camera ) : void
```

Updates the clip planes and position of the given camera so the globe is encapsulated correctly and is positioned appropriately above the terrain. Used when working with the transition manager to make sure both cameras being transitioned are positioned properly.

## GlobeControls

_extends [EnvironmentControls](#environmentcontrols)_

### .nearMargin

```js
nearMargin = 0.25 : number
```

The margin around the globe to include when positioning the camera near plane as a percentage of the max radius of the tile set ellipsoid. Useful for ensuring visualizations and other models are visible around the globe.

Default is 25%.

### .farMargin

```js
farMargin = 0 : number
```

The margin around the globe to include when positioning the camera far plane as a percentage of the max radius of the tile set ellipsoid. Useful for ensuring visualizations and other models are visible around the globe.

Default is 0%.

### .constructor

```js
constructor(
	scene = null : Scene,
	camera = null : Camera,
	domElement = null : DomElement,
)
```

Takes the same items as `EnvironmentControls` in addition to the Google globe tiles renderer.

### .setEllipsoid

```js
setEllipsoid( ellipsoid: Ellipsoid | null, ellipsoidGroup: Object3D | null ): void
```

Specifies the ellipsoid and a group representing the frame of the ellipsoid. Handles to both objects are retained so transformations can be respected.

## CameraTransitionManager

Helper class for performing a transition animation between a perspective and orthographic camera.

```js
const transition = new CameraTransitionManager( perspCamera, orthoCamera );
toggleButton.addEventListener( 'click', () => transition.toggle() );

// ...

renderer.setAnimationLoop( () => {

    // set transition.fixedPoint to point that should remain stable

    transition.update();
    renderer.render( transition.camera, scene );

} );
```

### .fixedPoint

```js
fixedPoint = ( 0, 0, 0 ) : Vector3
```

The point that will represents the plan that will remain fixed during the animation. This point should be in front of the cameras.

### .animating

```js
readonly animation : boolean
```

A flag indicating whether the transition is currently animating or not.

### .mode

```js
mode : 'perspective' | 'orthographic
```

The current mode of the camera that is active or being transitioned to. Setting this field will immediately change the camera.

### .duration

```js
durtion = 200 : Number
```

The length of time it takes to transition the camera in milliseconds.

### .camera

```js
readonly camera : Camera
```

The current camera to render with. Switches between the perspective camera, orthographic camera, and animated transition camera.

### .orthographicPositionalZoom

```js
orthographicPositionalZoom = true : boolean
```

Whether the orthographic camera position should be updated so be synchronized with the necessary perspective camera position so
the orthographic near clip planes do not get into into unexpected configurations.

### .autoSync

```js
autoSync = true : boolean
```

Whether to automatically call the "syncCameras" function when so cameras are implicitly positioned correctly for transitioning. Disable this if syncing will happen manually and small adjustments can be made.

### .easeFunction

```js
easeFunction = x => x : ( alpha: number ) => number
```

Function for defining the transition curve between cameras.

### .constructor

```js
constructor( perspectiveCamera : PerspectiveCamera, orthographicCamera : OrthographicCamera )
```

Constructor takes the two cameras to animate between.

### .update

```js
update( deltaTime = null : number ) : void
```

Performs the transition animation if active. Takes a delta time value in seconds to normalize inertia and damping speeds. Defaults to the time between call to the function.


### .syncCameras

```js
syncCameras() : void
```

Synchronizes the two camera positions and views based on the focus point.

### .toggle

```js
toggle() : void
```

Starts the transition animation.
