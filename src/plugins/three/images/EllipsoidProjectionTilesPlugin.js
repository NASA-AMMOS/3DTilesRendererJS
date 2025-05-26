import { ImageFormatPlugin, UV_BOUNDS } from './ImageFormatPlugin.js';
import { MathUtils, PlaneGeometry, Sphere, Vector2, Vector3 } from 'three';
import { ProjectionScheme } from './utils/ProjectionScheme.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _uv = /* @__PURE__ */ new Vector2();
const _sphere = /* @__PURE__ */ new Sphere();

export class EllipsoidProjectionTilesPlugin extends ImageFormatPlugin {

	constructor( options = {} ) {

		const {
			shape = 'planar',
			endCaps = true,
			...rest
		} = options;

		super( rest );

		this.shape = shape;
		this.projection = new ProjectionScheme();

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
				if ( projection.isMercator && _uv.y !== 0 && _uv.y !== 1 ) {

					// ensure we have an edge loop positioned at the mercator limit
					// to avoid UV distortion as much as possible at low LoDs
					const latLimit = projection.convertProjectionToLatitude( 1 );
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

				if ( projection.isMercator ) {

					const u = MathUtils.mapLinear( projection.convertLongitudeToProjection( lon ), minU, maxU, 0, 1 );
					const v = MathUtils.mapLinear( projection.convertLatitudeToProjection( lat ), minV, maxV, 0, 1 );
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
			if ( projection.isMercator ) {

				south = projection.convertProjectionToLatitude( minV );
				north = projection.convertProjectionToLatitude( maxV );
				west = projection.convertProjectionToLongitude( minU );
				east = projection.convertProjectionToLongitude( maxU );

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
			if ( projection.isMercator ) {

				const mercatorY = projection.convertLatitudeToProjection( midLat );
				lonFactor = projection.getLongitudeDerivativeAtValue( minU );
				latFactor = projection.getLatitudeDerivativeAtValue( mercatorY );

			} else {

				latFactor = Math.PI;
				lonFactor = 2 * Math.PI;

			}

			// TODO: is this correct?

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
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

}

