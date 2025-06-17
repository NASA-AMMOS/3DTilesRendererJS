import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { TiledImageSource } from './TiledImageSource.js';
import { MathUtils } from 'three';

export class TMSImageSource extends TiledImageSource {

	constructor() {

		super();

		this.tileSets = null;
		this.extension = null;
		this.url = null;

	}

	getUrl( x, y, level ) {

		const { url, extension, tileSets, tiling } = this;
		return new URL( `${ parseInt( tileSets[ level - tiling.minLevel ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

	init( url ) {

		return this
			.fetchData( new URL( 'tilemapresource.xml', url ), this.fetchOptions )
			.then( res => res.text() )
			.then( text => {

				const { tiling } = this;

				// elements
				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				const boundingBox = xml.querySelector( 'BoundingBox' );
				const origin = xml.querySelector( 'Origin' );
				const tileFormat = xml.querySelector( 'TileFormat' );
				const tileSets = xml.querySelector( 'TileSets' ).querySelectorAll( 'TileSet' );

				// tile set definitions
				const tileSetList = [ ...tileSets ]
					.map( ts => ( {
						href: parseInt( ts.getAttribute( 'href' ) ),
						unitsPerPixel: parseFloat( ts.getAttribute( 'units-per-pixel' ) ),
						order: parseInt( ts.getAttribute( 'order' ) ),
					} ) )
					.sort( ( a, b ) => {

						return a.order - b.order;

					} );

				// bounding box
				const minX = parseFloat( boundingBox.getAttribute( 'minx' ) ) * MathUtils.DEG2RAD;
				const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) ) * MathUtils.DEG2RAD;
				const minY = parseFloat( boundingBox.getAttribute( 'miny' ) ) * MathUtils.DEG2RAD;
				const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) ) * MathUtils.DEG2RAD;

				// origin in lat / lon
				const originX = parseFloat( origin.getAttribute( 'x' ) ) * MathUtils.DEG2RAD;
				const originY = parseFloat( origin.getAttribute( 'y' ) ) * MathUtils.DEG2RAD;

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				// assign settings
				this.extension = extension;
				this.url = url;
				this.tileSets = tileSetList;

				// initialize tiling and projection schemes
				tiling.setProjection( new ProjectionScheme( srs ) );
				tiling.setOrigin( originX, originY );
				tiling.setBounds( minX, minY, maxX, maxY );

				tileSetList.forEach( ( { order } ) => {

					tiling.setLevel( order, {
						tileCountX: tiling.projection.tileCountX * 2 ** order,
						tilePixelWidth: tileWidth,
						tilePixelHeight: tileHeight,
					} );

				} );

			} );

	}

}
