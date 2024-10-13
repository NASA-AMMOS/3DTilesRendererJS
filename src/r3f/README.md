# 3D Tiles React Components

Set of components for loading and rendering 3D Tiles in [@react-three/fiber](https://r3f.docs.pmnd.rs/).

**Examples**

[Basic example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/basic.html)

[Cesium Ion example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/ion.html)

[Google Photorealistic Tiles example](https://nasa-ammos.github.io/3DTilesRendererJS/example/bundle/globe.html)

# Use

## Simple

```jsx
import { TilesRenderer } from '3d-tiles-renderer/r3f';

const TILESET_URL = /* your tile set url */;
export default function App() {
  return (
    <Canvas>
      <TilesRenderer url={ TILESET_URL } />
    </Canvas>
  );
}
```

## With Plugins, Controls, & Attribution

Basic set up for Google Photorealistic tiles, Globe controls, and an overlay for displaying data set attributions.

```jsx
import { TilesRenderer, TilesPlugin, GlobeControls, TilesAttributionOverlay } from '3d-tiles-renderer/r3f';
import { DebugTilesPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer';

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
import { CesiumIonAuthPlugin, GoogleCloudAuthPlugin } from '3d-tiles-renderer';

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

Wrapper for the three.js `TilesRenderer` class. Listening for events are specified with a camel-case property prefixed with `on`, such as `onModelLoad`, and all other properties are specified as individual properties with dashes being used to indicate nested properties. For example, `lruCache-minSize` is used to set `lruCache.minSize`.

```jsx
<TilesRenderer
  url={ tilesetUrl }

  // set options to the TilesRenderer object
  errorTarget={ 6 }
  errorThreshold={ 10 }

  // set nested object options of the TilesRenderer
  parseQueue-maxJobs={ 30 }
  downloadQueue-maxJobs={ 10 }
  lruCache-minBytesSize={ 0.25 * 1e6 }
  lruCache-maxBytesSize={ 0.5 * 1e6 }

  // event registration
  onTileSetLoad={ onTileSetLoadCallback }
  onModelLoad={ onModelLoadCallback }
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

The `EastNorthUpFrame` is used to place 3D objects in a local reference frame that is centered on the provided origin, specified via lat/lon/height and euler angles props. `EastNorthUpFrame` does not transform the tileset root while `ReorientationPlugin` does transform the tileset. `EastNorthUpFrame`, instead, creates a frame on the surface of the globe that you can add children to if one, for example, want to create markers on the planet surface.

```jsx
function GeopositionedModel( props ) {
  return (
    <EastNorthUpFrame
      lat = { lat * Math.PI / 180 }
      lon = { lon * Math.PI / 180 }
      height = { 100 }
      az = { 0 }
      el = { 0 }
      roll = { 0 }
    >
      <SuziModel position={ [ 0, 0, 2 ] } rotation-z={ Math.PI / 2 * 0 } rotation-y={ - Math.PI / 2 } scale={ 1 } materialProps={ { color:'#0000cc' } } />
    </EastNorthUpFrame>
  );
}

function SuziModel( props ) {
  const { nodes } = useGLTF( 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf' );
  return (
    <mesh castShadow receiveShadow geometry={ nodes.Suzanne.geometry } { ...props }>
      <meshStandardMaterial color={ "#9d4b4b" } { ...props.materialProps } />
    </mesh>
  );
}
```

## TilesAttributionOverlay

TODO

```jsx
```jsx
<TilesRenderer url={ url } { ...props }>
  <TilesAttributionOverlay />
</TilesRenderer>
```
