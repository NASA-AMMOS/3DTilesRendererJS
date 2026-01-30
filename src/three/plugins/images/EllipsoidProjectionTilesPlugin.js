import { ImageFormatPlugin, TILE_LEVEL, TILE_X, TILE_Y } from './ImageFormatPlugin.js';
import { MathUtils, PlaneGeometry, Sphere, Vector2, Vector3 } from 'three';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

const MIN_LON_VERTS = 30;
const MIN_LAT_VERTS = 15;

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _uv = /* @__PURE__ */ new Vector2();
const _sphere = /* @__PURE__ */ new Sphere();

export class EllipsoidProjectionTilesPlugin extends ImageFormatPlugin {

	get projection() {

		return this.tiling.projection;

	}

	constructor( options = {} ) {

		const {
			shape = 'planar',
			endCaps = true,
			...rest
		} = options;

		super( rest );

		// options
		this.shape = shape;
		this.endCaps = endCaps;

	}

	// override the parse to mesh logic to support a region mesh
	async parseToMesh( buffer, tile, ...args ) {

		const mesh = await super.parseToMesh( buffer, tile, ...args );

		// if displaying the tiles as an ellipsoid
		const { shape, projection, tiles, tiling } = this;
		if ( shape === 'ellipsoid' ) {

			const ellipsoid = tiles.ellipsoid;
			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];

			// new geometry
			// default to a minimum number of vertices per degree on each axis
			const [ west, south, east, north ] = tile.boundingVolume.region;
			const latVerts = Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 );
			const lonVerts = Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 );
			const yVerts = Math.max( MIN_LAT_VERTS, latVerts );
			const xVerts = Math.max( MIN_LON_VERTS, lonVerts );
			const geometry = new PlaneGeometry( 1, 1, xVerts, yVerts );

			const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );
			const uvRange = tiling.getTileContentUVBounds( x, y, level );

			// adjust the geometry to position it at the region
			const { position, normal, uv } = geometry.attributes;
			const vertCount = position.count;
			tile.engineData.boundingVolume.getSphere( _sphere );
			for ( let i = 0; i < vertCount; i ++ ) {

				// retrieve attributes
				_pos.fromBufferAttribute( position, i );
				_uv.fromBufferAttribute( uv, i );

				// convert the plane position to lat / lon
				const lon = projection.convertNormalizedToLongitude( MathUtils.mapLinear( _uv.x, 0, 1, minU, maxU ) );
				let lat = projection.convertNormalizedToLatitude( MathUtils.mapLinear( _uv.y, 0, 1, minV, maxV ) );

				// snap the edges to the poles if using mercator projection and end caps are enabled
				if ( projection.isMercator && this.endCaps ) {

					if ( maxV === 1 && _uv.y === 1 ) {

						lat = Math.PI / 2;

					}

					if ( minV === 0 && _uv.y === 0 ) {

						lat = - Math.PI / 2;

					}

				}

				// ensure we have an edge loop positioned at the mercator limit to avoid UV distortion
				// as much as possible at low LoDs.
				if ( projection.isMercator && _uv.y !== 0 && _uv.y !== 1 ) {

					const latLimit = projection.convertNormalizedToLatitude( 1 );
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

				// get the position and normal
				ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
				ellipsoid.getCartographicToNormal( lat, lon, _norm );

				// map from the uvs for the tile into the uv range
				const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, uvRange[ 0 ], uvRange[ 2 ] );
				const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, uvRange[ 1 ], uvRange[ 3 ] );

				// update the geometry
				uv.setXY( i, u, v );
				position.setXYZ( i, ..._pos );
				normal.setXYZ( i, ..._norm );

			}

			mesh.geometry = geometry;
			mesh.position.copy( _sphere.center );

		}

		return mesh;

	}

	createBoundingVolume( x, y, level ) {

		if ( this.shape === 'ellipsoid' ) {

			const { tiling, endCaps } = this;
			const isRoot = level === - 1;
			const normalizedBounds = isRoot ? tiling.getContentBounds( true ) : tiling.getTileBounds( x, y, level, true, true );
			const cartBounds = isRoot ? tiling.getContentBounds() : tiling.getTileBounds( x, y, level, false, true );

			if ( endCaps ) {

				// if the north side is at the edge
				if ( normalizedBounds[ 3 ] === 1 ) {

					cartBounds[ 3 ] = Math.PI / 2;

				}

				// if the south side is at the edge
				if ( normalizedBounds[ 1 ] === 0 ) {

					cartBounds[ 1 ] = - Math.PI / 2;

				}

			}

			return {
				region: [ ...cartBounds, - 1, 1 ],
			};

		} else {

			return super.createBoundingVolume( x, y, level );

		}

	}

	createChild( ...args ) {

		const tile = super.createChild( ...args );

		const { shape, projection, tiling } = this;
		if ( tile && shape === 'ellipsoid' ) {

			const level = tile[ TILE_LEVEL ];
			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];

			// if this is the root node then skip calculating the geometric error
			if ( level === - 1 ) {

				tile.geometricError = 1e50;
				return parent;

			}

			const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true );
			const { tilePixelWidth, tilePixelHeight } = tiling.getLevel( level );

			// one pixel width in uv space
			const tileUWidth = ( maxU - minU ) / tilePixelWidth;
			const tileVWidth = ( maxV - minV ) / tilePixelHeight;

			// calculate the region ranges
			const [ /* west */, south, east, north ] = tiling.getTileBounds( x, y, level );

			// calculate the changes in lat / lon at the given point
			// find the most bowed point of the latitude range since the amount that latitude changes is
			// dependent on the Y value of the image
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			const midV = projection.convertLatitudeToNormalized( midLat );
			const lonFactor = projection.getLongitudeDerivativeAtNormalized( minU );
			const latFactor = projection.getLatitudeDerivativeAtNormalized( midV );

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			const projectedPixelWidth = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );
			tile.geometricError = projectedPixelWidth;

		}

		return tile;

	}

}

