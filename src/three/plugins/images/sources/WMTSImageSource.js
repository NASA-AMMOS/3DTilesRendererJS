import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

// TODO
// - WMTS supports tile ranges at the matrix level that need to be accounted for in the tiling scheme
// - Enable image overlays to work more smoothly when the url is constructed by the image source
// - Add ability to set wmts fields after the fact?
// - Account for resolution / scale denominator relative to the equator (implicitly convert to lat / lons)
export class WMTSImageSource extends TiledImageSource {

	constructor( options = {} ) {

		super();

		const {
			capabilities,
			dimensions = {},
		} = options;

		let {
			layer = null,
			tileMatrixSet = null,
			style = null,
			url = null,
		} = options;

		if ( ! layer ) {

			layer = capabilities.layers[ 0 ];

		} else if ( typeof layer === 'string' ) {

			layer = capabilities.layers.find( l => l.identifier === layer );

		}

		if ( ! tileMatrixSet ) {

			tileMatrixSet = layer.tileMatrixSets[ 0 ];

		} else if ( typeof tileMatrixSet === 'string' ) {

			tileMatrixSet = layer.tileMatrixSets.find( tms => tms.identifier === tileMatrixSet );

		}

		if ( ! style ) {

			style = layer.styles.find( style => style.isDefault ).identifier;

		}

		if ( ! url ) {

			url = layer.resourceUrls[ 0 ].template;

		}

		this.layer = layer;
		this.tileMatrixSet = tileMatrixSet;
		this.style = style;
		this.dimensions = dimensions;
		this.url = url;

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*TileMatrix\s*}/gi, level )
			.replace( /{\s*TileCol\s*}/gi, x )
			.replace( /{\s*TileRow\s*}/gi, y );

	}

	init() {

		// transform the url
		const { tiling, layer, tileMatrixSet, style, url, dimensions } = this;

		const projection = tileMatrixSet.supportedCRS.includes( '4326' ) ? 'EPSG:4326' : 'EPSG:3857';

		tiling.flipY = true;
		tiling.setProjection( new ProjectionScheme( projection ) );
		tiling.setBounds( ...tiling.projection.getBounds() );

		tileMatrixSet.tileMatrices.forEach( ( tm, i ) => {

			const { tileWidth, tileHeight } = tm;
			tiling.setLevel( i, {
				tilePixelWidth: tileWidth,
				tilePixelHeight: tileHeight,
				tileCountX: tiling.projection.tileCountX * 2 ** i,
				tileCountY: tiling.projection.tileCountY * 2 ** i,
			} );

		} );

		this.url = url
			.replace( /{\s*TileMatrixSet\s*}/g, tileMatrixSet.identifier )
			.replace( /{\s*Style\s*}/g, style );

		for ( const key in dimensions ) {

			this.url = this.url.replace( new RegExp( `{\\s*${ key }\\s*}` ), dimensions[ key ] );

		}

		layer.dimensions.forEach( dim => {

			this.url = this.url.replace( new RegExp( `{\\s*${ dim.identifier }\\s*}` ), dim.defaultValue );

		} );

		return Promise.resolve();

	}

}
