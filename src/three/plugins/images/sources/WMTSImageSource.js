import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

function isCRS84( crs ) {

	return /(:84|:crs84)$/i.test( crs );

}

export class WMTSImageSource extends TiledImageSource {

	constructor( options = {} ) {

		const {
			capabilities = null,
			layer = null,
			tileMatrixSet = null,
			style = null,
			url = null,
			dimensions = {},
			...rest
		} = options;

		super( rest );

		this.capabilities = capabilities;
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

		const { tiling, dimensions, capabilities } = this;
		let { layer, tileMatrixSet, style, url } = this;

		// extract the layer to use
		if ( ! layer ) {

			layer = capabilities.layers[ 0 ];

		} else if ( typeof layer === 'string' ) {

			layer = capabilities.layers.find( l => l.identifier === layer );

		}

		// extract the tile matrix set
		if ( ! tileMatrixSet ) {

			tileMatrixSet = layer.tileMatrixSets[ 0 ];

		} else if ( typeof tileMatrixSet === 'string' ) {

			tileMatrixSet = layer.tileMatrixSets.find( tms => tms.identifier === tileMatrixSet );

		}

		// extract the style
		if ( ! style ) {

			style = layer.styles.find( style => style.isDefault ).identifier;

		}

		// extract the url template
		if ( ! url ) {

			url = layer.resourceUrls[ 0 ].template;

		}

		// determine the projection
		const supportedCRS = tileMatrixSet.supportedCRS;
		const projection = ( supportedCRS.includes( '4326' ) || isCRS84( supportedCRS ) ) ? 'EPSG:4326' : 'EPSG:3857';

		// generate the tiling scheme
		tiling.flipY = true;
		tiling.setProjection( new ProjectionScheme( projection ) );

		if ( layer.boundingBox !== null ) {

			tiling.setContentBounds( ...layer.boundingBox.bounds );

		} else {

			tiling.setContentBounds( ...tiling.projection.getBounds() );

		}

		tileMatrixSet.tileMatrices.forEach( ( tm, i ) => {

			// TODO: needs to set tileCountX from matrix width?
			// TODO: How does bounds and tile count work together here?
			// Can one typically be generated from the other?

			const { tileWidth, tileHeight, matrixWidth, matrixHeight } = tm;
			tiling.setLevel( i, {
				tilePixelWidth: tileWidth,
				tilePixelHeight: tileHeight,
				tileCountX: matrixWidth || tiling.projection.tileCountX * 2 ** i,
				tileCountY: matrixHeight || tiling.projection.tileCountY * 2 ** i,
				tileBounds: tm.bounds,
			} );

		} );

		// construct the url
		url = url
			.replace( /{\s*TileMatrixSet\s*}/g, tileMatrixSet.identifier )
			.replace( /{\s*Style\s*}/g, style );

		// fill in the dimension values
		for ( const key in dimensions ) {

			url = url.replace( new RegExp( `{\\s*${ key }\\s*}` ), dimensions[ key ] );

		}

		layer.dimensions.forEach( dim => {

			url = url.replace( new RegExp( `{\\s*${ dim.identifier }\\s*}` ), dim.defaultValue );

		} );

		this.url = url;

		return Promise.resolve();

	}

}
