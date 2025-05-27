import { ImageFormatPlugin, TILE_LEVEL, TILE_X, TILE_Y } from './ImageFormatPlugin.js';
import { MathUtils, PlaneGeometry, Sphere, Vector2, Vector3 } from 'three';
import { ProjectionScheme } from './utils/ProjectionScheme.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

const MAX_LON_VERTS = 30;
const MAX_LAT_VERTS = 15;

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

		this.projection = new ProjectionScheme();

		// options
		this.shape = shape;
		this.endCaps = endCaps;

	}

	// override the parse to mesh logic to support a region mesh
	async parseToMesh( buffer, tile, ...args ) {

		const { shape, projection, tiles, tiling } = this;
		const mesh = await super.parseToMesh( buffer, tile, ...args );

		// if displaying the tiles as an ellipsoid
		if ( shape === 'ellipsoid' ) {

			const ellipsoid = tiles.ellipsoid;
			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];

			const [ minU, minV, maxU, maxV ] = tiling.getNormalizedTileSpan( x, y, level, 0 );
			const [ west, south, east, north ] = tile.boundingVolume.region;

			// new geometry
			// default to a minimum number of vertices per degree on each axis
			const latVerts = Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 );
			const lonVerts = Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 );
			const yVerts = Math.max( MAX_LAT_VERTS, latVerts );
			const xVerts = Math.max( MAX_LON_VERTS, lonVerts );
			const geometry = new PlaneGeometry( 1, 1, xVerts, yVerts );

			// adjust the geometry to position it at the region
			const { position, normal, uv } = geometry.attributes;
			const vertCount = position.count;
			tile.cached.boundingVolume.getSphere( _sphere );
			for ( let i = 0; i < vertCount; i ++ ) {

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

				// update the geometry
				const u = MathUtils.mapLinear( projection.convertLongitudeToProjection( lon ), minU, maxU, 0, 1 );
				const v = MathUtils.mapLinear( projection.convertLatitudeToProjection( lat ), minV, maxV, 0, 1 );
				uv.setXY( i, u, v );
				position.setXYZ( i, ..._pos );
				normal.setXYZ( i, ..._norm );

			}

			mesh.geometry = geometry;
			mesh.position.copy( _sphere.center );

		}

		return mesh;

	}

	preprocessNode( tile, ...rest ) {

		super.preprocessNode( tile, rest );

		const { shape, projection, endCaps, tiling } = this;
		if ( shape === 'ellipsoid' ) {

			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			const [ minU, minV, maxU, maxV ] = tiling.getNormalizedTileSpan( x, y, level, 0 );
			const { tilePixelWidth, tilePixelHeight } = tiling.getLevel( level );
			const { pixelWidth, pixelHeight } = tiling.getLevel( tiling.maxLevel );

			// one pixel width in uv space
			const tileUWidth = ( maxU - minU ) / tilePixelWidth;
			const tileVWidth = ( maxV - minV ) / tilePixelHeight;
			const rootUWidth = 1 / pixelWidth;
			const rootVWidth = 1 / pixelHeight;

			// calculate the region ranges
			const west = projection.convertProjectionToLongitude( minU );
			const east = projection.convertProjectionToLongitude( maxU );
			let south = projection.convertProjectionToLatitude( minV );
			let north = projection.convertProjectionToLatitude( maxV );

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

			tile.boundingVolume.region = [
				west, south, east, north,
				- 1, 1 // min / max height
			];

			// calculate the changes in lat / lon at the given point
			// find the most bowed point of the latitude range since the amount that latitude changes is
			// dependent on the Y value of the image
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			const midV = projection.convertLatitudeToProjection( midLat );
			const lonFactor = projection.getLongitudeDerivativeAtValue( minU );
			const latFactor = projection.getLatitudeDerivativeAtValue( midV );

			// TODO: is this correct?

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			const tilePixelWidth2 = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );
			const rootPixelWidth = Math.max( rootUWidth * lonFactor * xDeriv, rootVWidth * latFactor * yDeriv );
			tile.geometricError = tilePixelWidth2 - rootPixelWidth;

			delete tile.boundingVolume.box;

			// if this is the root then keep the geometric error high
			if ( tile.parent === null ) {

				tile.geometricError = 1e50;

			}

		}

		return tile;

	}

}

