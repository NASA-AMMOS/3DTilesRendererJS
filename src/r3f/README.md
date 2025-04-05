# 3D Tiles React Components

Set of components for loading and rendering 3D Tiles in [@react-three/fiber](https://r3f.docs.pmnd.rs/).

**Examples**

[Basic example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/r3f/basic.html)

[Cesium Ion example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/r3f/ion.html)

[Google Photorealistic Tiles example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/r3f/globe.html)

# Use

## Simple

```jsx
import { TilesRenderer } from '3d-tiles-renderer/r3f';

const TILESET_URL = /* your tile set url */;
const cameraPosition = [ x, y, z ]; // Set the camera position so the tiles are visible
export default function App() {
  return (
    <Canvas camera={ { position: cameraPosition } }>
      <TilesRenderer url={ TILESET_URL } />
    </Canvas>
  );
}
```

## With Plugins, Controls, & Attribution

Basic set up for Google Photorealistic tiles, Globe controls, and an overlay for displaying data set attributions.

```jsx
import { TilesRenderer, TilesPlugin, GlobeControls, TilesAttributionOverlay } from '3d-tiles-renderer/r3f';
import { DebugTilesPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

export default function App() {
  return (
    <Canvas camera={ { position: [ 0, 0, 1e8 ] } }>
      <TilesRenderer>
        <TilesPlugin plugin={ DebugTilesPlugin } displayBoxBounds={ true } />
        <TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken: /* your api token here */ } } />
        <GlobeControls />
        <TilesAttributionOverlay />
      </TilesRenderer>
    </Canvas>
  );
}
```

## Cesium Ion & Google Cloud

Simplified wrappers for using the TilesRenderer with Cesium Ion and Google Cloud for Photorealistic Tiles. Use the `TilesAttributionOverlay` to display appropriate credits for the data sets.

```jsx
import { TilesRenderer, TilesPlugin } from '3d-tiles-renderer/r3f';
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

function GoogleTilesRenderer( { children, apiToken, ...rest } ) {
  return (
    <TilesRenderer { ...rest } key={ apiToken }>
      <TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } />
      { children }
    </TilesRenderer>
  );
}

function CesiumIonTilesRenderer( { children, apiToken, assetId, ...rest } ) {
  return (
    <TilesRenderer { ...rest } key={ apiToken + assetId }>
      <TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken, assetId } } />
      { children }
    </TilesRenderer>
  );
}
```

# Components

## TilesRenderer

Wrapper for the three.js `TilesRenderer` class. Listening for events are specified with a camel-case property prefixed with `on`, such as `onLoadModel`, and all other properties are specified as individual properties with dashes being used to indicate nested properties. For example, `lruCache-minSize` is used to set `lruCache.minSize`.

```jsx
<TilesRenderer
  url={ tilesetUrl }

	// if false then "update" is not called
	enabled={ true }

	// pass properties to apply to the tile set root object
	group={ {
		position: [ 0, 10, 0 ],
		rotation: [ Math.PI / 2, 0, 0 ],
	} }

  // set options to the TilesRenderer object
  errorTarget={ 6 }
  errorThreshold={ 10 }

  // set nested object options of the TilesRenderer
  parseQueue-maxJobs={ 30 }
  downloadQueue-maxJobs={ 10 }
  lruCache-minBytesSize={ 0.25 * 1e6 }
  lruCache-maxBytesSize={ 0.5 * 1e6 }

  // event registration
  onLoadTileSet={ onLoadTileSetCallback }
  onLoadModel={ onLoadModelCallback }
/>
```

## TilesPlugin

Plugins can be set as children of the TilesRenderer component to add additional functionality. TilePlugin components must be nested inside a TilesRenderer component. Constructor arguments are passed via the `args` parameter while local members can be passed via the regular properties. But note that depending on the plugin some properties cannot be changed after construction and initialization.

See the [PLUGINS documentation](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/PLUGINS.md) for docs on all avilable plugins.

```jsx
<TilesRenderer url={ tilesetUrl }>
  <TilesPlugin
    plugin={ PluginClassName }
    args={ /* constructor arguments as array or object */ }
    { ...pluginProps }
  />
</TilesRenderer>
```

And a practical example of creating and using a plugin:

```jsx
<TilesRenderer url={ tilesetUrl } >
  <TilesPlugin plugin={ GLTFExtensionsPlugin }
    dracoLoader={ dracoLoader }
    ktxLoader={ ktx2Loader }
    autoDispose={ false }
    { /*
      // alternatively the options can be passed via constructor arguments
      // or a mix of both can be used.
      args = { {
        dracoLoader,
        ktxLoader,
        autoDispose: false,
      } }
    */ }
  />
</TilesRenderer>
```

## Controls

These `EnvironmentControls` and `GlobeControls` classes have been wrapped as components to handle user-interaction. They will both be set to the `controls` react three fiber state field when in use. All properties on the original classes can be passed as properties:

```jsx
<>
  <TilesRenderer url={ url } { ...props } />
  <EnvironmentControls enableDamping={ true } enabled={ true } />
</>
```

The `GlobeControls` component must be set as a child of the `TilesRenderer` component that is providing the ellipsoid to orbit around.

```jsx
<TilesRenderer url={ url } { ...props }>
  <GlobeControls enableDamping={ true } />
</TilesRenderer>
```

## EastNorthUpFrame

The `EastNorthUpFrame` creates a root object that is centered on the provided point relative to the tile sets ellipsoid, specified via lat/lon/height and euler angle props and is used to place 3D objects relative to that point. It does not rotate the original tile set and must be a child of a `TilesRenderer` component.

It can be used to place markers on the surface of the ellipsoid, such as a cone for pointing to a location:

```jsx
<TilesRenderer url={ url } { ...props }>
  { /* ... */ }
  <EastNorthUpFrame
    {/* The latitude and longitude to place the frame at in radians */}
    lat={ lat }
    lon={ lon }

    {/* The height above the ellipsoid to place the frame at in meters */}
    height={ 100 }

    {/*
      The azimuth, elevation, and roll around the "north" axis, applied
      in that order intrinsicly, in radians
    */}
    az={ 0 }
    el={ 0 }
    roll={ 0 }
  >
    {/* Children are position relative to the east, north, up frame */}
    <mesh rotation-x={ - Math.PI / 2 } scale={ 100 } position-z={ 50 }>
      <coneGeometry args={ [ 0.5 ] } />
      <meshStandardMaterial color={ 'red' } />
    </mesh>
  </EastNorthUpFrame>
</TilesRenderer>
```

## TilesAttributionOverlay

The `TilesAttributionOverlay` component must be embedded in a tile set and will automatically display the credits associated with the loaded data set.

```jsx
<TilesRenderer url={ url } { ...props }>
  <TilesAttributionOverlay

    { /*
      Callback function for generating attribution elements from credit info.
      Takes the list of attributions and a unique "id" assigned to the overlay dom element.
    */ }
    generateAttributions={ null }

    { /* remaining properties are assigned to the root overlay element */ }
  />
</TilesRenderer>
```

## CompassGizmo

Adds a compass to the bottom right of the page that orients to "north" based on the camera position and orientation. Must be nested in a `TilesRenderer` component.

Any children passed into the class will replace the default red and white compass design with +Y pointing north and +X pointing east. The graphic children should fit within a volume from - 0.5 to 0.5 along all axes.

```jsx
<CompassGizmo
	{/* Specifies whether the compass will render in '2d' or '3d' */}
	mode={ '3d' }

	{/* The size of the compass in pixels */}
	scale={ 35 }

	{/* The number pixels in margin to add relative to the bottom right of the screen */}
	margin={ 10 }

	{/* Whether to render the main scene */}
	overrideRenderLoop={ true }

	{/* Whether the gizmo is visible and rendering */}
	visible={ true }

	{/* Any remaining props including click events are passed through to the parent group */}
	onClick={ () => console.log( 'compass clicked!' ) }
/>
```
