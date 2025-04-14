import { ImageFormatPlugin, UV_BOUNDS } from './ImageFormatPlugin.js';
import { MathUtils, PlaneGeometry, Sphere, Vector2, Vector3 } from 'three';

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _uv = /* @__PURE__ */ new Vector2();
const _sphere = /* @__PURE__ */ new Sphere();
const _v0 = /* @__PURE__ */ new Vector3();
const _v1 = /* @__PURE__ */ new Vector3();

export class EllipsoidProjectionTilesPlugin extends ImageFormatPlugin {

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

			// TODO: is this correct?

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

