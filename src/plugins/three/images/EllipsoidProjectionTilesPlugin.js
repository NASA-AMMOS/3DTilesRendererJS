import { ImageFormatPlugin, UV_BOUNDS } from './ImageFormatPlugin.js';
import { MathUtils, PlaneGeometry, Sphere, Vector2, Vector3 } from 'three';

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _uv = /* @__PURE__ */ new Vector2();
const _sphere = /* @__PURE__ */ new Sphere();
const _v0 = /* @__PURE__ */ new Vector3();
const _v1 = /* @__PURE__ */ new Vector3();

class EllipsoidProjectionTilesPlugin extends ImageFormatPlugin {

	constructor( options = {} ) {

		const {
			shape = 'planar',
			endCaps = true,
			...rest
		} = options;

		super( rest );

		this.shape = shape;
		this.projection = 'geodetic';
		this.endCaps = endCaps;

		// TODO: are these necessary?
		this.minLat = - Math.PI / 2;
		this.maxLat = Math.PI / 2;
		this.minLon = - Math.PI;
		this.maxLon = Math.PI;

	}

	// override the parse to mesh logic to support a region mesh
	async parseToMesh( buffer, tile, ...args ) {

		const { shape, projection, tiles } = this;
		const mesh = await super.parseToMesh( buffer, tile, ...args );

		// if displaying the tiles as an ellipsoid
		if ( shape === 'ellipsoid' ) {

			const ellipsoid = tiles.ellipsoid;
			const [ minU, minV, maxU, maxV ] = tile[ UV_BOUNDS ];
			const [ west, south, east, north ] = tile.boundingVolume.region;

			// new geometry
			// default to a minimum number of vertices per degree on each axis
			const MAX_LON_VERTS = 30;
			const MAX_LAT_VERTS = 15;
			const latVerts = Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 );
			const lonVerts = Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 );
			const yVerts = Math.max( MAX_LAT_VERTS, latVerts );
			const xVerts = Math.max( MAX_LON_VERTS, lonVerts );
			const geometry = new PlaneGeometry(
				1, 1,
				xVerts,
				yVerts,
			);

			// adjust the geometry to position it at the region
			const { position, normal, uv } = geometry.attributes;
			const vertCount = position.count;
			tile.cached.boundingVolume.getSphere( _sphere );
			for ( let i = 0; i < vertCount; i ++ ) {

				// TODO: If we're at a mercator north / south boundary we should position an edge so that
				// it sits exactly at the right point.
				_pos.fromBufferAttribute( position, i );
				_norm.fromBufferAttribute( normal, i );
				_uv.fromBufferAttribute( uv, i );

				const lon = MathUtils.mapLinear( _uv.x, 0, 1, west, east );
				let lat = MathUtils.mapLinear( _uv.y, 0, 1, south, north );
				if ( projection === 'mercator' && _uv.y !== 0 && _uv.y !== 1 ) {

					// ensure we have an edge loop positioned at the mercator limit
					// to avoid UV distortion as much as possible at low LoDs
					const latLimit = this.mercatorToLatitude( 1 );
					const vStep = 1 / yVerts;

					const prevLat = MathUtils.mapLinear( _uv.y - vStep, 0, 1, south, north );
					const nextLat = MathUtils.mapLinear( _uv.y + vStep, 0, 1, south, north );

					if ( lat > latLimit && prevLat < latLimit ) {

						lat = latLimit;

					}

					if ( lat < - latLimit && nextLat > - latLimit ) {

						lat = - latLimit;

					}

				}

				ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
				ellipsoid.getCartographicToNormal( lat, lon, _norm );

				position.setXYZ( i, ..._pos );
				normal.setXYZ( i, ..._norm );

				if ( projection === 'mercator' ) {

					const u = MathUtils.mapLinear( this.longitudeToMercator( lon ), minU, maxU, 0, 1 );
					const v = MathUtils.mapLinear( this.latitudeToMercator( lat ), minV, maxV, 0, 1 );
					uv.setXY( i, u, v );

				}

			}

			mesh.geometry = geometry;
			mesh.position.copy( _sphere.center );

		}

		return mesh;

	}

	preprocessNode( tile, ...rest ) {

		super.preprocessNode( tile, rest );

		const { shape, projection, tileWidth, tileHeight, width, height, endCaps } = this;
		if ( shape === 'ellipsoid' ) {

			const [ minU, minV, maxU, maxV ] = tile[ UV_BOUNDS ];

			// one pixel width in uv space
			const tileUWidth = ( maxU - minU ) / tileWidth;
			const tileVWidth = ( maxV - minV ) / tileHeight;
			const rootUWidth = 1 / width;
			const rootVWidth = 1 / height;

			// calculate the region ranges
			let south, north, west, east;
			if ( projection === 'mercator' ) {

				south = this.mercatorToLatitude( minV );
				north = this.mercatorToLatitude( maxV );
				west = this.mercatorToLongitude( minU );
				east = this.mercatorToLongitude( maxU );

				// TODO: need to make sure this is actually at the edge of the full mercator
				// extent rather than a sub view.
				if ( endCaps ) {

					if ( maxV === 1 ) {

						north = Math.PI / 2;

					}

					if ( minV === 0 ) {

						south = - Math.PI / 2;

					}

				}

			} else {

				const { minLat, maxLat, minLon, maxLon } = this;
				south = MathUtils.lerp( minLat, maxLat, minV );
				north = MathUtils.lerp( minLat, maxLat, maxV );
				west = MathUtils.lerp( minLon, maxLon, minU );
				east = MathUtils.lerp( minLon, maxLon, maxU );

			}

			tile.boundingVolume.region = [
				west, south, east, north,
				- 1, 1 // min / max height
			];

			// calculate the changes in lat / lon at the given point
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			let latFactor, lonFactor;
			if ( projection === 'mercator' ) {

				const mercatorY = this.latitudeToMercator( midLat );
				[ latFactor, lonFactor ] = this.getMercatorToCartographicDerivative( minU, mercatorY );

			} else {

				latFactor = Math.PI;
				lonFactor = 2 * Math.PI;

			}

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = this.getCartographicToMeterDerivative( midLat, east );
			const tilePixelWidth = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );
			const rootPixelWidth = Math.max( rootUWidth * lonFactor * xDeriv, rootVWidth * latFactor * yDeriv );
			tile.geometricError = tilePixelWidth - rootPixelWidth;

			delete tile.boundingVolume.box;

			// if this is the root then keep the geometric error high
			if ( tile.parent === null ) {

				tile.geometricError = 1e50;

			}

		}

		return tile;

	}

	latitudeToMercator( lat ) {

		// https://stackoverflow.com/questions/14329691/convert-latitude-longitude-point-to-a-pixels-x-y-on-mercator-projection
		const mercatorN = Math.log( Math.tan( ( Math.PI / 4 ) + ( lat / 2 ) ) );
		return ( 1 / 2 ) + ( 1 * mercatorN / ( 2 * Math.PI ) );

	}

	longitudeToMercator( lon ) {

		return ( lon + Math.PI ) / ( 2 * Math.PI );

	}

	mercatorToLatitude( value ) {

		// https://gis.stackexchange.com/questions/447421/convert-a-point-on-a-flat-2d-web-mercator-map-image-to-a-coordinate
		// TODO: support partial lat ranges here
		// const { minLat, maxLat } = this;
		const ratio = MathUtils.mapLinear( value, 0, 1, - 1, 1 );
		return 2 * Math.atan( Math.exp( ratio * Math.PI ) ) - Math.PI / 2;

	}

	mercatorToLongitude( value ) {

		const { minLon, maxLon } = this;
		return MathUtils.mapLinear( value, 0, 1, minLon, maxLon );

	}

	getMercatorToCartographicDerivative( x, y ) {

		const EPS = 1e-5;
		let xp = x - EPS;
		let yp = y - EPS;
		if ( xp < 0 ) {

			xp = x + EPS;

		}

		if ( yp < 0 ) {

			yp = y + EPS;

		}

		return [
			Math.abs( this.mercatorToLatitude( y ) - this.mercatorToLatitude( yp ) ) / EPS,
			Math.abs( this.mercatorToLongitude( x ) - this.mercatorToLongitude( xp ) ) / EPS,
		];

	}

	getCartographicToMeterDerivative( lat, lon ) {

		const { tiles } = this;
		const { ellipsoid } = tiles;

		const EPS = 1e-5;
		const lonp = lon + EPS;
		let latp = lat + EPS;
		if ( Math.abs( latp ) > Math.PI / 2 ) {

			latp = latp - EPS;

		}

		ellipsoid.getCartographicToPosition( lat, lon, 0, _v0 );

		ellipsoid.getCartographicToPosition( latp, lon, 0, _v1 );
		const dy = _v0.distanceTo( _v1 ) / EPS;

		ellipsoid.getCartographicToPosition( lat, lonp, 0, _v1 );
		const dx = _v0.distanceTo( _v1 ) / EPS;

		return [ dx, dy ];

	}

}

// Support for XYZ / Slippy tile systems
// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export class XYZTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			levels = 20,
			tileDimension = 256,
			pixelSize = 1e-5,
			...rest
		} = options;

		super( { pixelSize, ...rest } );

		this.name = 'XYZ_TILES_PLUGIN';
		this.tileWidth = tileDimension;
		this.tileHeight = tileDimension;
		this.levels = levels;
		this.url = null;
		this.flipY = true;

	}

	async loadRootTileSet() {

		// transform the url
		const { tiles, tileWidth, tileHeight, maxLevel } = this;
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		this.width = tileWidth * ( 2 ** maxLevel );
		this.height = tileHeight * ( 2 ** maxLevel );
		this.url = url;
		this.projection = 'mercator';

		return this.getTileset( url );

	}

	getUrl( level, x, y ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

	}

}

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'TMS_TILES_PLUGIN';
		this.flipY = false;
		this.url = null;
		this.extension = null;

	}

	loadRootTileSet() {

		const url = new URL( 'tilemapresource.xml', this.tiles.rootURL ).toString();
		return this.tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				// const boundingBox = xml.querySelector( 'BoundingBox' );
				// const origin = xml.querySelector( 'Origin' );
				const tileFormat = xml.querySelector( 'TileFormat' );
				const tileSets = xml.querySelector( 'TileSets' );
				const tileSetList = [ ...tileSets.querySelectorAll( 'TileSet' ) ]
					.map( ts => ( {
						href: parseInt( ts.getAttribute( 'href' ) ),
						unitsPerPixel: parseFloat( ts.getAttribute( 'units-per-pixel' ) ),
						order: parseInt( ts.getAttribute( 'order' ) ),
					} ) )
					.sort( ( a, b ) => {

						return a.order - b.order;

					} );

				// TODO: need to account for these values (origin and min values) when generating ellipsoid
				// TODO: might want to account for this offset when positioning the tiles? Or expose it? Could be
				// used for overlays.
				// TODO: the origin can be outside the box bounds and result in negative values for tiles. The tile coordinates
				// may need to account for this origin positioning - ie they may not start at 0, 0?
				// the extents of the tile set in lat / lon
				// const minX = parseFloat( boundingBox.getAttribute( 'minx' ) );
				// const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) );
				// const minY = parseFloat( boundingBox.getAttribute( 'miny' ) );
				// const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) );

				// origin in lat / lon
				// const x = parseFloat( origin.getAttribute( 'x' ) );
				// const y = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );

				const profile = tileSets.getAttribute( 'profile' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				switch ( srs ) {

					case 'EPSG:3857': // web-mercator spherical projection
					case 'EPSG:4326': // equirect projection
						break;
					default:
						throw new Error( `TMSTilesPlugin: ${ srs } SRS not supported.` );

				}

				// TODO: global-geodetic seems to require two horizontal root tiles. Is hardcoding the right way?
				let widthMultiplier = 1;
				let heightMultiplier = 1;
				switch ( profile ) {

					case 'geodetic':
					case 'global-geodetic':
						widthMultiplier = 2;
						heightMultiplier = 1;
						this.projection = 'geodetic';
						break;
					case 'mercator':
					case 'global-mercator':
						this.projection = 'mercator';
						break;
					case 'local':
					case 'none':
					default:
						throw new Error( `TMSTilesPlugin: Profile ${ profile } not supported.` );

				}

				const levels = tileSetList.length;
				const maxLevel = levels - 1;
				this.extension = extension;
				this.width = widthMultiplier * tileWidth * ( 2 ** maxLevel );
				this.height = heightMultiplier * tileHeight * ( 2 ** maxLevel );
				this.tileWidth = tileWidth;
				this.tileHeight = tileHeight;
				this.levels = levels;
				this.url = this.tiles.rootURL;
				this.tileSets = tileSetList;

				// ellipsoid projection data
				// this.minLat = minY;
				// this.maxLat = maxY;
				// this.minLon = minX;
				// this.maxLon = maxX;

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}
