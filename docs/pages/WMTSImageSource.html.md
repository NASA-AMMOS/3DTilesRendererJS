# Class: WMTSImageSource

## WMTSImageSource(optionsopt)

WMTS (Web Map Tile Service) image source for loading tiled map imagery.

This class provides support for loading map tiles from WMTS-compliant services. It handles parsing WMTS capabilities documents and constructing proper tile URLs.

## Constructor

#### new WMTSImageSource(optionsopt)

Creates a new WMTSImageSource instance.

##### Parameters:

Name

Type

Attributes

Default

Description

`options`

Object

<optional>  

{}

Configuration options

###### Properties

Name

Type

Attributes

Default

Description

`capabilities`

Object

<optional>  

null

Parsed WMTS capabilities object from WMTSCapabilitiesLoader

`layer`

string | Object

<optional>  

null

Layer identifier string or layer object. If null, uses first available layer.

`tileMatrixSet`

string | Object

<optional>  

null

TileMatrixSet identifier or object. If null, uses first available.

`style`

string

<optional>  

null

Style identifier. If null, uses the default style.

`url`

string

<optional>  

null

Custom URL template. If null, extracted from capabilities.

`dimensions`

Object

<optional>  

{}

Dimension values (e.g., { Time: '2023-01-01' })

##### Examples

```js
// Basic usage with WMTSCapabilitiesLoader
import { WMTSCapabilitiesLoader, WMTSTilesPlugin } from '3d-tiles-renderer/plugins';

// Load capabilities
const capabilities = await new WMTSCapabilitiesLoader().loadAsync(
    'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&request=GetCapabilities'
);

// Create tiles renderer with WMTS plugin
const tiles = new TilesRenderer();
tiles.registerPlugin(new WMTSTilesPlugin({
    capabilities,
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    shape: 'ellipsoid',
    center: true,
}));
```
```js
// Usage with custom dimensions (e.g., time)
tiles.registerPlugin(new WMTSTilesPlugin({
    capabilities,
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    dimensions: {
        Time: '2013-06-16'
    }
}));
```

### Extends

*   TiledImageSource

### Classes

[WMTSImageSource](WMTSImageSource.html)

### Members
#### capabilities :Object|null

Parsed WMTS capabilities object

##### Type:

*   Object | null

#### dimensions :Object

Dimension values for the WMTS request

##### Type:

*   Object

#### layer :string|Object|null

The layer to render (identifier string or layer object)

##### Type:

*   string | Object | null

#### style :string|null

The style identifier

##### Type:

*   string | null

#### tileMatrixSet :string|Object|null

The tile matrix set to use (identifier string or object)

##### Type:

*   string | Object | null

#### url :string|null

The URL template for tile requests

##### Type:

*   string | null

### Methods
#### getUrl(x, y, level) → {string}

Generates the URL for a specific tile.

##### Parameters:

Name

Type

Description

`x`

number

Tile column index

`y`

number

Tile row index

`level`

number

Zoom level (TileMatrix)

##### Returns:

The complete URL for the requested tile

Type

string

#### init() → {Promise.<void>}

Initializes the image source by parsing capabilities and setting up the tiling scheme.

This method:

*   Resolves layer, tileMatrixSet, and style from capabilities
*   Determines the projection (EPSG:4326 or EPSG:3857)
*   Configures the tiling scheme with proper bounds and tile sizes
*   Constructs the final URL template

##### Returns:

Resolves when initialization is complete

Type

Promise.<void>

  
🌙