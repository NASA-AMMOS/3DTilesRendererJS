# 3d-tiles-renderer/core/plugins


## CesiumIonAuth


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
constructor( {
	apiToken: string,
	autoRefreshToken = false: boolean,
} )
```

## CesiumIonAuthPlugin


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
constructor( {
	apiToken: string,
	assetId = null: number | null,
	autoRefreshToken = false: boolean,
	useRecommendedSettings = true: boolean,
	assetTypeHandler?: ( type: string, tiles: TilesRendererBase, asset: Object ) => void,
} )
```

## EnforceNonZeroErrorPlugin


## GoogleCloudAuth


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
constructor( {
	apiToken: string,
	sessionOptions = null: Object | null,
	autoRefreshToken = false: boolean,
} )
```

## GoogleCloudAuthPlugin


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
constructor( {
	apiToken: string,
	sessionOptions = null: Object | null,
	autoRefreshToken = false: boolean,
	logoUrl = null: string | null,
	useRecommendedSettings = true: boolean,
} )
```

## ImplicitTilingPlugin


## QuantizedMeshLoaderBase

_extends [`LoaderBase`](../renderer/API.md#loaderbase)_

