<!-- This file is generated automatically. Do not edit it directly. -->
# 3d-tiles-renderer/core/plugins

## CesiumIonAuth

Authentication helper for Cesium Ion. Fetches and caches a bearer token from the
Cesium Ion endpoint and injects it into outgoing requests. Supports optional
automatic token refresh on 4xx responses.


### .apiToken

```js
apiToken: string
```

The Cesium Ion access token.


### .autoRefreshToken

```js
autoRefreshToken: boolean
```

Whether to automatically refresh the token on 4xx errors.


### .authURL

```js
authURL: string | null
```

The endpoint URL used to fetch the bearer token.


### .constructor

```js
constructor(
	{
		apiToken: string,
		autoRefreshToken = false: boolean,
	}
)
```

## CesiumIonAuthPlugin

Plugin for authenticating requests to Cesium Ion. Handles token refresh, asset endpoint
resolution, and attribution collection. Automatically registers a GoogleCloudAuthPlugin
when the resolved asset is an external Google photorealistic tileset.


### .assetId

```js
assetId: number | null
```

The Cesium Ion asset ID to load, or null if using an explicit root URL.


### .autoRefreshToken

```js
autoRefreshToken: boolean
```

Whether to automatically refresh the token on 4xx errors.


### .useRecommendedSettings

```js
useRecommendedSettings: boolean
```

Whether to apply recommended renderer settings for Cesium Ion assets.


### .assetTypeHandler

```js
assetTypeHandler: ( type: string, tiles: TilesRendererBase, asset: Object ) => void
```

Callback invoked when the resolved Cesium Ion asset type is not `3DTILES`.


### .tiles

```js
tiles: Object | null
```

The TilesRenderer instance this plugin is registered with.


### .constructor

```js
constructor(
	{
		apiToken: string,
		assetId = null: number | null,
		autoRefreshToken = false: boolean,
		useRecommendedSettings = true: boolean,
		assetTypeHandler?: (
			type: string,
			tiles: TilesRendererBase,
			asset: Object
		) => void,
	}
)
```

## EnforceNonZeroErrorPlugin

Plugin that ensures every tile has a non-zero geometric error. Tiles with a geometric
error of zero are assigned a derived value based on the nearest ancestor with a non-zero
error, halved once per level of depth below that ancestor.


## GoogleCloudAuth

Authentication helper for Google Cloud Maps APIs. Manages session-token creation and
renewal for both the Photorealistic 3D Tiles API and the 2D Map Tiles API, injecting
the API key and session token into outgoing requests.


### .apiToken

```js
apiToken: string
```

The Google Cloud API key.


### .autoRefreshToken

```js
autoRefreshToken: boolean
```

Whether to automatically refresh the session token on 4xx errors.


### .authURL

```js
authURL: string
```

The endpoint URL used to create or refresh the session token.


### .sessionToken

```js
sessionToken: string | null
```

The current session token, or null if not yet established.


### .sessionOptions

```js
sessionOptions: Object | null
```

Session options passed as the POST body when creating a Map Tiles session.


### .constructor

```js
constructor(
	{
		apiToken: string,
		sessionOptions = null: Object | null,
		autoRefreshToken = false: boolean,
	}
)
```

## GoogleCloudAuthPlugin

Plugin for authenticating requests to the Google Cloud Maps APIs, including the
Photorealistic 3D Tiles and 2D Map Tiles APIs. Handles session-token management,
per-tile attribution collection, and optional logo attribution.


### .apiToken

```js
apiToken: string
```

The Google Cloud API key.


### .useRecommendedSettings

```js
useRecommendedSettings: boolean
```

Whether to apply recommended renderer settings for photorealistic tiles.


### .logoUrl

```js
logoUrl: string | null
```

URL of a logo image to include in attribution output, or null if not set.


### .tiles

```js
tiles: Object | null
```

The TilesRenderer instance this plugin is registered with.


### .constructor

```js
constructor(
	{
		apiToken: string,
		sessionOptions = null: Object | null,
		autoRefreshToken = false: boolean,
		logoUrl = null: string | null,
		useRecommendedSettings = true: boolean,
	}
)
```

## ImplicitTilingPlugin

Plugin that adds support for 3D Tiles 1.1 implicit tiling. Intercepts tiles that carry
an `implicitTiling` field and expands them by loading and parsing `.subtree` files,
generating child tiles according to the implicit subdivision scheme.


## QuantizedMeshLoaderBase

_extends [`LoaderBase`](../renderer/API.md#loaderbase)_

Base loader for quantized-mesh terrain tiles. Parses the binary quantized-mesh format
into structured vertex, index, edge, and extension data. Sets the required `Accept`
header automatically. Subclasses should implement geometry construction from the
parsed result.


## TilesFadePluginBase

Base class for plugins that fade tile geometry in and out as tile LODs change. Dispatches
`fade-change`, `fade-start`, and `fade-end` events on the `TilesRenderer`. Subclasses
implement the engine specific hooks below.


### .fadeDuration

```js
fadeDuration: number = 250
```

Time in milliseconds for a tile to fully fade in or out.


### .fadingTiles

```js
fadingTiles: number
```

Number of tiles currently fading.


### .constructor

```js
constructor(
	{
		// Time in milliseconds for a tile to fully fade in or out.
		fadeDuration = 250: number,

		// Maximum simultaneous fade-out tiles. If exceeded, tiles pop
		// instead of fading.
		maximumFadeOutTiles = 50: number,

		// Whether root-level tiles fade in on their first appearance.
		fadeRootTiles = false: boolean,
	}
)
```

### .prepareTileScene

```js
prepareTileScene( scene: Object, tile: Tile ): void
```

Called when a tile model loads so its scene can be prepared for fading.


### .releaseTileScene

```js
releaseTileScene( scene: Object, tile: Tile ): void
```

Called when a tile model is disposed so any fade state can be released.


### .setFadeState

```js
setFadeState( tile: Tile, fadeIn: number, fadeOut: number ): void
```

Applies the fade values to a fading tile each update.


### .resetFadeState

```js
resetFadeState( tile: Tile, visible: boolean ): void
```

Clears the fade values from a tile once its fade completes.


### .updateCameraState

```js
updateCameraState( checkMovement: boolean ): boolean
```

Tracks the camera transforms and returns whether they moved quickly since the last update.

