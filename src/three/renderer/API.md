<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/three

## Constants

### ENU_FRAME

```js
ENU_FRAME: Frames
```

Frame constant for the East-North-Up (ENU) coordinate frame, with X pointing east,
Y pointing north, and Z pointing up (away from the ellipsoid surface).

### CAMERA_FRAME

```js
CAMERA_FRAME: Frames
```

Frame constant for a camera-convention frame relative to the ENU frame, oriented with
"+Y" up and "-Z" forward (matching three.js camera conventions).

### OBJECT_FRAME

```js
OBJECT_FRAME: Frames
```

Frame constant for an object-convention frame relative to the ENU frame, oriented with
"+Y" up and "+Z" forward (matching three.js object conventions).

## B3DMLoader


### .constructor

```js
constructor( manager: LoadingManager )
```

## CameraTransitionManager


### .animating

```js
readonly animating: boolean
```

Whether a transition animation is currently in progress.


### .alpha

```js
readonly alpha: number
```

Transition progress from 0 (at perspective) to 1 (at orthographic).


### .camera

```js
readonly camera: Camera
```

The currently active camera. Returns `perspectiveCamera`, `orthographicCamera`, or the
blended `transitionCamera` depending on the current transition state.


### .mode

```js
mode: string
```

The target camera mode. Set to `'perspective'` or `'orthographic'` to jump instantly without
animation. Use `toggle()` to animate the transition.


### .orthographicPositionalZoom

```js
orthographicPositionalZoom: boolean
```

When true, the orthographic camera position is offset backwards along the view direction so it does not clip into terrain. Default is true.


### .orthographicOffset

```js
orthographicOffset: number
```

Distance the orthographic camera is pushed back when `orthographicPositionalZoom` is true. Default is 50.


### .fixedPoint

```js
fixedPoint: Vector3
```

World-space point that remains visually fixed during the transition.


### .duration

```js
duration: number
```

Duration of the animated transition in milliseconds. Default is 200.


### .autoSync

```js
autoSync: boolean
```

When true, cameras are synced automatically before each `update` call. Default is true.


### .easeFunction

```js
easeFunction: function
```

Easing function applied to the raw transition alpha. Receives and returns a value in [0, 1]. Default is the identity function.


### .constructor

```js
constructor( perspectiveCamera: PerspectiveCamera, orthographicCamera: OrthographicCamera )
```

### .toggle

```js
toggle(): void
```

Begins an animated transition to the opposite camera mode. Dispatches a `'toggle'` event.


### .update

```js
update( deltaTime: number ): void
```

Advances the transition animation and updates the active camera. Must be called each frame.


### .syncCameras

```js
syncCameras(): void
```

Synchronises the non-active camera so that both cameras represent the same viewpoint.
Called automatically by `update` when `autoSync` is true.


## CMPTLoader


### .constructor

```js
constructor( manager: LoadingManager )
```

## Ellipsoid


### .name

```js
name: string
```

Optional name for this ellipsoid instance.


### .radius

```js
radius: Vector3
```

Semi-axis radii of the ellipsoid.


### .constructor

```js
constructor( x = 1: number, y = 1: number, z = 1: number )
```

### .intersectRay

```js
intersectRay( ray: Ray, target: Vector3 ): Vector3 | null
```

Returns the point where the given ray intersects the ellipsoid surface, or null if no
intersection exists. Writes the result into `target`.


### .getEastNorthUpFrame

```js
getEastNorthUpFrame(
	lat: number,
	lon: number,
	height: number,
	target: Matrix4
): Matrix4
```

Returns a Matrix4 representing the East-North-Up (ENU) frame at the given geographic
position: X points east, Y points north, Z points up. Writes the result into `target`.


### .getOrientedEastNorthUpFrame

```js
getOrientedEastNorthUpFrame(
	lat: number,
	lon: number,
	height: number,
	az: number,
	el: number,
	roll: number,
	target: Matrix4
): Matrix4
```

Returns a Matrix4 representing the ENU frame at the given position, rotated by the given
azimuth, elevation, and roll. Equivalent to `getObjectFrame` with `ENU_FRAME`.


### .getObjectFrame

```js
getObjectFrame(
	lat: number,
	lon: number,
	height: number,
	az: number,
	el: number,
	roll: number,
	target: Matrix4,
	frame = OBJECT_FRAME: Frames
): Matrix4
```

Returns a Matrix4 representing a frame at the given geographic position, rotated by the
given azimuth, elevation, and roll, and adjusted to match the three.js `frame` convention.
`OBJECT_FRAME` orients with "+Y" up and "+Z" forward; `CAMERA_FRAME` orients with "+Y" up
and "-Z" forward; `ENU_FRAME` returns the raw ENU-relative rotation.


### .getCartographicFromObjectFrame

```js
getCartographicFromObjectFrame(
	matrix: Matrix4,
	target: Object,
	frame = OBJECT_FRAME: Frames
): Object
```

Extracts geographic position and orientation (lat, lon, height, azimuth, elevation, roll)
from the given object/camera frame matrix. The inverse of `getObjectFrame`. Writes the
result into `target` and returns it.


### .getEastNorthUpAxes

```js
getEastNorthUpAxes(
	lat: number,
	lon: number,
	vecEast: Vector3,
	vecNorth: Vector3,
	vecUp: Vector3,
	point: Vector3
): void
```

Fills in the east, north, and up unit vectors for the ENU frame at the given latitude and
longitude. Optionally writes the surface position into `point`.


### .getCartographicToPosition

```js
getCartographicToPosition(
	lat: number,
	lon: number,
	height: number,
	target: Vector3
): Vector3
```

Converts geographic coordinates to a 3D Cartesian position on the ellipsoid surface
(plus the given height offset). Writes the result into `target` and returns it.


### .getPositionToCartographic

```js
getPositionToCartographic( pos: Vector3, target: Object ): Object
```

Converts a 3D Cartesian position to geographic coordinates (lat, lon, height). Writes the
result into `target` and returns it.


### .getCartographicToNormal

```js
getCartographicToNormal( lat: number, lon: number, target: Vector3 ): Vector3
```

Returns the surface normal of the ellipsoid at the given latitude and longitude. Writes the
result into `target` and returns it.


### .getPositionToNormal

```js
getPositionToNormal( pos: Vector3, target: Vector3 ): Vector3
```

Returns the surface normal of the ellipsoid at the given 3D Cartesian position. Writes the
result into `target` and returns it.


### .getPositionToSurfacePoint

```js
getPositionToSurfacePoint( pos: Vector3, target: Vector3 ): Vector3 | null
```

Projects the given 3D position onto the ellipsoid surface along the geodetic normal.
Returns null if the position is at or near the center. Writes the result into `target`.


### .calculateHorizonDistance

```js
calculateHorizonDistance( latitude: number, elevation: number ): number
```

Returns the geometric distance to the horizon from the given latitude and elevation above
the ellipsoid surface.


### .calculateEffectiveRadius

```js
calculateEffectiveRadius( latitude: number ): number
```

Returns the prime vertical radius of curvature (distance from the center of the ellipsoid
to the surface along the normal) at the given latitude.


### .getPositionElevation

```js
getPositionElevation( pos: Vector3 ): number
```

Returns the height of the given 3D position above (or below) the ellipsoid surface.


### .closestPointToRayEstimate

```js
closestPointToRayEstimate( ray: Ray, target: Vector3 ): Vector3
```

Returns an estimate of the closest point on the ellipsoid surface to the given ray.
Returns the exact surface intersection point if the ray intersects the ellipsoid.


### .copy

```js
copy( source: Ellipsoid ): this
```

Copies the radius from the given ellipsoid into this one.


### .clone

```js
clone(): Ellipsoid
```

Returns a new Ellipsoid with the same radius as this one.


## EnvironmentControls


### .enabled

```js
enabled: boolean
```

Whether the controls are active. When set to false, all input is ignored
and inertia is cleared.


### .cameraRadius

```js
cameraRadius: number
```

Minimum camera distance above the surface in world units. Prevents clipping into terrain. Default is 5.


### .rotationSpeed

```js
rotationSpeed: number
```

Rotation sensitivity multiplier. Default is 1.


### .minAltitude

```js
minAltitude: number
```

Minimum camera angle above the horizon in radians. Default is 0.


### .maxAltitude

```js
maxAltitude: number
```

Maximum camera angle above the horizon in radians. Default is 0.45π.


### .minDistance

```js
minDistance: number
```

Minimum zoom distance in world units. Default is 10.


### .maxDistance

```js
maxDistance: number
```

Maximum zoom distance in world units. Default is Infinity.


### .minZoom

```js
minZoom: number
```

Minimum orthographic zoom level. Default is 0.


### .maxZoom

```js
maxZoom: number
```

Maximum orthographic zoom level. Default is Infinity.


### .zoomSpeed

```js
zoomSpeed: number
```

Zoom sensitivity multiplier. Default is 1.


### .adjustHeight

```js
adjustHeight: boolean
```

When true, the camera height is automatically adjusted to avoid clipping into the terrain. Default is true.


### .enableDamping

```js
enableDamping: boolean
```

When true, camera movements decelerate gradually after input ends. Default is false.


### .dampingFactor

```js
dampingFactor: number
```

Rate of inertia decay per frame when damping is enabled. Lower values produce longer coasting. Default is 0.15.


### .fallbackPlane

```js
fallbackPlane: Plane
```

Fallback plane used for drag/zoom when no scene geometry is hit. Default is the XZ plane (y=0).


### .useFallbackPlane

```js
useFallbackPlane: boolean
```

When true, the fallback plane is used when raycasting misses scene geometry. Default is true.


### .constructor

```js
constructor( scene = null: Object3D, camera = null: Camera, domElement = null: HTMLElement )
```

### .setScene

```js
setScene( scene: Object3D ): void
```

Sets the scene to raycast against for surface-based interaction.


### .setCamera

```js
setCamera( camera: Camera ): void
```

Sets the camera to control.


### .attach

```js
attach( domElement: HTMLElement ): void
```

Attaches the controls to a DOM element, registering all pointer and keyboard event listeners.


### .detach

```js
detach(): void
```

Detaches the controls from the DOM element, removing all event listeners.


### .getUpDirection

```js
getUpDirection( point: Vector3, target: Vector3 ): void
```

Returns the local up direction at a world-space point. Override to provide terrain-aware
up vectors (e.g. ellipsoid normals). Default returns the controls' `up` vector.


### .getCameraUpDirection

```js
getCameraUpDirection( target: Vector3 ): void
```

Returns the local up direction at the camera's current position.


### .getPivotPoint

```js
getPivotPoint( target: Vector3 ): Vector3 | null
```

Returns the current drag or rotation pivot point in world space.


### .resetState

```js
resetState(): void
```

Clears the current interaction state, cancelling any active drag, rotate, or zoom.


### .setState

```js
setState( state: number, fireEvent = true: boolean ): void
```

Sets the current control state (e.g. `NONE`, `DRAG`, `ROTATE`, `ZOOM`).


### .update

```js
update( deltaTime: number ): void
```

Applies pending input and inertia to the camera. Must be called each frame.


### .adjustCamera

```js
adjustCamera( camera: Camera ): void
```

Adjusts the camera to satisfy altitude and distance constraints. Called automatically by `update`.
Override in subclasses to add custom camera adjustment behaviour (e.g. near/far plane updates).


### .dispose

```js
dispose(): void
```

Disposes of event listeners and internal resources. Calls `detach` if currently attached.


## GlobeControls


### .ellipsoidFrame

```js
readonly ellipsoidFrame: Matrix4
```

The world matrix of `ellipsoidGroup`, representing the ellipsoid's coordinate frame.


### .ellipsoidFrameInverse

```js
readonly ellipsoidFrameInverse: Matrix4
```

The inverse of `ellipsoidFrame`.


### .nearMargin

```js
nearMargin: number
```

Fraction of the near plane distance added as a buffer. Default is 0.25.


### .farMargin

```js
farMargin: number
```

Fraction of the far plane distance added as a buffer. Default is 0.


### .globeInertia

```js
globeInertia: Quaternion
```

Accumulated globe rotation inertia quaternion. Applied each frame when globe inertia is active.


### .globeInertiaFactor

```js
globeInertiaFactor: number
```

Magnitude of the current globe rotation inertia. Decays to zero over time.


### .ellipsoid

```js
ellipsoid: Ellipsoid
```

The ellipsoid model used for surface interaction and up-direction calculation. Defaults to WGS84.


### .ellipsoidGroup

```js
ellipsoidGroup: Group
```

The Three.js group whose world matrix defines the ellipsoid's coordinate frame.


### .constructor

```js
constructor( scene = null: Object3D, camera = null: Camera, domElement = null: HTMLElement )
```

### .setEllipsoid

```js
setEllipsoid( ellipsoid: Ellipsoid, ellipsoidGroup: Group ): void
```

Sets the ellipsoid model and its scene group for globe-aware interaction.


### .getVectorToCenter

```js
getVectorToCenter( target: Vector3 ): Vector3
```

Returns the vector from the camera to the center of the ellipsoid in world space.


### .getDistanceToCenter

```js
getDistanceToCenter(): number
```

Returns the distance from the camera to the center of the ellipsoid.


## I3DMLoader


### .constructor

```js
constructor( manager: LoadingManager )
```

## PNTSLoader


### .constructor

```js
constructor( manager: LoadingManager )
```

## TilesRenderer


### .autoDisableRendererCulling

```js
autoDisableRendererCulling: boolean
```

If `true`, all tile meshes automatically have `frustumCulled` set to `false` since the
tiles renderer performs its own frustum culling. If `displayActiveTiles` is `true` or
multiple cameras are being used, consider setting this to `false`.


### .group

```js
group: Group
```

The container `Group` for the 3D tiles. Add this to the three.js scene. The group
also exposes a `matrixWorldInverse` field for transforming objects into the local
tileset frame.


### .ellipsoid

```js
ellipsoid: Ellipsoid
```

The ellipsoid definition used for the tileset. Defaults to WGS84 and may be
overridden by the `3DTILES_ellipsoid` extension. Specified in the local frame of
`TilesRenderer.group`.


### .cameras

```js
cameras: Array<Camera>
```

Array of cameras registered with this renderer.


### .manager

```js
manager: LoadingManager
```

The `LoadingManager` used when loading tile geometry.


### .getBoundingBox

```js
getBoundingBox( target: Box3 ): boolean
```

Returns the axis-aligned bounding box of the root tile in the group's local space.


### .getOrientedBoundingBox

```js
getOrientedBoundingBox( targetBox: Box3, targetMatrix: Matrix4 ): boolean
```

Returns the oriented bounding box and transform of the root tile.


### .getBoundingSphere

```js
getBoundingSphere( target: Sphere ): boolean
```

Returns the bounding sphere of the root tile in the group's local space.


### .forEachLoadedModel

```js
forEachLoadedModel( callback: function ): void
```

Iterates over all currently loaded tile scenes.


### .raycast

```js
raycast( raycaster: Raycaster, intersects: Array ): void
```

Performs a raycast against all loaded tile scenes. Compatible with Three.js raycasting.
Supports `raycaster.firstHitOnly` for early termination.


### .hasCamera

```js
hasCamera( camera: Camera ): boolean
```

Returns whether the given camera is registered with this renderer.


### .setCamera

```js
setCamera( camera: Camera ): boolean
```

Registers a camera with the renderer so it is used for tile selection and screen-space error
calculation. Use `setResolution` or `setResolutionFromRenderer` to provide the camera's resolution.


### .setResolution

```js
setResolution( camera: Camera, xOrVec: number | Vector2, y: number ): boolean
```

Sets the render resolution for a registered camera, used for screen-space error calculation.


### .setResolutionFromRenderer

```js
setResolutionFromRenderer( camera: Camera, renderer: WebGLRenderer ): boolean
```

Sets the render resolution for a camera by reading the current size from a WebGLRenderer.


### .deleteCamera

```js
deleteCamera( camera: Camera ): boolean
```

Unregisters a camera from the renderer.

