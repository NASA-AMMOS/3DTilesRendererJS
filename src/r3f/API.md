<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/r3f

## CanvasDOMOverlay

Creates a DOM overlay positioned absolutely over the canvas. Children are rendered into a
separate React root. Remaining props are passed to the root div element.

### Props

```jsx
<CanvasDOMOverlay
	children?: ReactNode
/>
```

### .children

```jsx
children?: ReactNode
```

DOM content to render in the overlay.

## CameraTransition

Manages transitions between perspective and orthographic cameras. Wraps CameraTransitionManager
and integrates with R3F's camera state. All CameraTransitionManager properties can be set as props.

### Props

```jsx
<CameraTransition
	mode?: string = 'perspective'
	perspectiveCamera?: PerspectiveCamera
	orthographicCamera?: OrthographicCamera
	onBeforeToggle?: function
/>
```

### .mode

```jsx
mode?: string = 'perspective'
```

Active camera mode: `'perspective'` or `'orthographic'`.

### .perspectiveCamera

```jsx
perspectiveCamera?: PerspectiveCamera
```

Override the internal perspective camera.

### .orthographicCamera

```jsx
orthographicCamera?: OrthographicCamera
```

Override the internal orthographic camera.

### .onBeforeToggle

```jsx
onBeforeToggle?: function
```

Called before the camera mode switches, with the manager
and target camera as arguments. Defaults to syncing via active controls if present.

## TilesAttributionOverlay

Displays attributions collected from the loaded tileset. Must be a child of TilesRenderer.
Remaining props are passed to the underlying CanvasDOMOverlay element.

### Props

```jsx
<TilesAttributionOverlay
	generateAttributions?: function
	style?: Object
	children?: ReactNode
/>
```

### .generateAttributions

```jsx
generateAttributions?: function
```

Custom function to generate attribution elements.
Receives the attributions array and the overlay element's unique id. Defaults to built-in rendering.

### .style

```jsx
style?: Object
```

Style overrides applied to the overlay container.

### .children

```jsx
children?: ReactNode
```

Additional content rendered above the attributions.

## AnimatedSettledObject

A SettledObject that smoothly interpolates its position as the query result updates.
Must be a descendant of SettledObjects.

### Props

```jsx
<AnimatedSettledObject
	interpolationFactor?: number = 0.025
	onQueryUpdate?: function
/>
```

### .interpolationFactor

```jsx
interpolationFactor?: number = 0.025
```

Controls interpolation speed. Smaller values produce slower, smoother movement.

### .onQueryUpdate

```jsx
onQueryUpdate?: function
```

Called with the raycast hit result each time the query updates.

## EastNorthUpFrame

Creates a group positioned and oriented at a geographic coordinate on the tileset ellipsoid.
Must be a child of TilesRenderer. Does not modify the tileset transform.

### Props

```jsx
<EastNorthUpFrame
	lat?: number = 0
	lon?: number = 0
	height?: number = 0
	az?: number = 0
	el?: number = 0
	roll?: number = 0
	ellipsoid?: Ellipsoid
	children?: ReactNode
/>
```

### .lat

```jsx
lat?: number = 0
```

Latitude in radians.

### .lon

```jsx
lon?: number = 0
```

Longitude in radians.

### .height

```jsx
height?: number = 0
```

Height above the ellipsoid in meters.

### .az

```jsx
az?: number = 0
```

Azimuth rotation in radians, applied first.

### .el

```jsx
el?: number = 0
```

Elevation rotation in radians, applied second.

### .roll

```jsx
roll?: number = 0
```

Roll rotation in radians, applied third.

### .ellipsoid

```jsx
ellipsoid?: Ellipsoid
```

Ellipsoid to use when no TilesRenderer parent is present.

### .children

```jsx
children?: ReactNode
```

Children positioned relative to the east-north-up frame.

## EnvironmentControls

Wraps the three.js EnvironmentControls class. Automatically attaches to the R3F camera, scene,
and canvas. All EnvironmentControls properties can be set as props.

### Props

```jsx
<EnvironmentControls
	camera?: Camera
	scene?: Object3D
	domElement?: HTMLCanvasElement
/>
```

### .camera

```jsx
camera?: Camera
```

Override the default R3F camera.

### .scene

```jsx
scene?: Object3D
```

Override the default R3F scene.

### .domElement

```jsx
domElement?: HTMLCanvasElement
```

Override the default canvas element.

## GlobeControls

Wraps the three.js GlobeControls class. Must be a child of TilesRenderer to receive ellipsoid
context. All GlobeControls properties can be set as props.

### Props

```jsx
<GlobeControls
	camera?: Camera
	scene?: Object3D
	domElement?: HTMLCanvasElement
/>
```

### .camera

```jsx
camera?: Camera
```

Override the default R3F camera.

### .scene

```jsx
scene?: Object3D
```

Override the default R3F scene.

### .domElement

```jsx
domElement?: HTMLCanvasElement
```

Override the default canvas element.

## SettledObject

Positions a component on the surface of the tileset at a lat/lon coordinate or along a ray.
Must be a descendant of SettledObjects.

### Props

```jsx
<SettledObject
	component?: ReactNode = <group/>
	lat?: number = null
	lon?: number = null
	rayorigin?: Vector3 = null
	raydirection?: Vector3 = null
	onQueryUpdate?: function
/>
```

### .component

```jsx
component?: ReactNode = <group/>
```

The element to clone and position on the surface.

### .lat

```jsx
lat?: number = null
```

Latitude in radians. Use with `lon` for geographic positioning.

### .lon

```jsx
lon?: number = null
```

Longitude in radians. Use with `lat` for geographic positioning.

### .rayorigin

```jsx
rayorigin?: Vector3 = null
```

Ray origin for arbitrary ray-based positioning.

### .raydirection

```jsx
raydirection?: Vector3 = null
```

Ray direction for arbitrary ray-based positioning.

### .onQueryUpdate

```jsx
onQueryUpdate?: function
```

Called with the raycast hit result each time the query updates.

## CompassGizmo

Renders a compass overlay that rotates to indicate north based on the camera orientation relative
to the tileset ellipsoid. Must be a child of TilesRenderer. Remaining props are passed to the
root group element.

### Props

```jsx
<CompassGizmo
	mode?: string = '3d'
	scale?: number = 35
	margin?: number | Array = 10
	visible?: boolean = true
	overrideRenderLoop?: boolean
	children?: ReactNode
/>
```

### .mode

```jsx
mode?: string = '3d'
```

Rotation mode: `'3d'` tracks full camera orientation, `'2d'` tracks yaw only.

### .scale

```jsx
scale?: number = 35
```

Size of the compass in pixels.

### .margin

```jsx
margin?: number | Array = 10
```

Margin from the bottom-right corner in pixels. Pass `[x, y]` to set each axis independently.

### .visible

```jsx
visible?: boolean = true
```

Whether the compass is rendered.

### .overrideRenderLoop

```jsx
overrideRenderLoop?: boolean
```

If true, renders the main scene before drawing the compass overlay.

### .children

```jsx
children?: ReactNode
```

Custom compass graphic replacing the default. Should fit within a -0.5 to 0.5 unit cube with +Y pointing north and +X pointing east.

## TilesPlugin

Registers a plugin on the nearest parent TilesRenderer. Must be a child of TilesRenderer.
All properties on the plugin instance can be set as props directly. Note that some plugin
properties cannot be changed after construction.

### Props

```jsx
<TilesPlugin
	plugin: function
	args?: Object | Array
	children?: ReactNode
/>
```

### .plugin

```jsx
plugin: function
```

The plugin class to instantiate.

### .args

```jsx
args?: Object | Array
```

Constructor arguments: an object (single arg) or array (spread as multiple args).

### .children

```jsx
children?: ReactNode
```

Children rendered once the plugin is registered.

## SettledObjects

Manages raycasting queries against the tileset for positioning child SettledObject components.
Must be a child of TilesRenderer. All QueryManager properties can be set as props.

### Props

```jsx
<SettledObjects
	scene?: Object3D | Array
	children?: ReactNode
/>
```

### .scene

```jsx
scene?: Object3D | Array
```

Scene(s) to raycast against. Defaults to the R3F scene.

### .children

```jsx
children?: ReactNode
```

SettledObject or AnimatedSettledObject components.

## TilesRenderer

Wrapper for the three.js TilesRenderer class. All properties on the TilesRenderer instance can
be set as props using dot-notation for nested properties (e.g. `lruCache-minSize`). Events are
registered with a camel-cased `on` prefix (e.g. `onLoadModel`).

### Props

```jsx
<TilesRenderer
	url?: string
	enabled?: boolean = true
	group?: Object
	children?: ReactNode
/>
```

### .url

```jsx
url?: string
```

URL of the tileset to load.

### .enabled

```jsx
enabled?: boolean = true
```

If false, `update` is not called on the renderer each frame.

### .group

```jsx
group?: Object
```

Props applied to the root Three.js group of the tileset.

### .children

```jsx
children?: ReactNode
```

Child components such as TilesPlugin, GlobeControls, etc.
