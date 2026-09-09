/** @import { ImageOverlay } from './ImageOverlayPlugin.js' */
import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, Vector3, Sphere } from 'three';
export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';
import { TilingScheme } from './utils/TilingScheme.js';
import { ProjectionScheme } from './utils/ProjectionScheme.js';
import { ProjectedSurface } from './utils/ProjectedSurface.js';

const MIN_LON_VERTS = 30;
const MIN_LAT_VERTS = 15;
const DEFAULT_LEVELS = 20;

const OVERLAY_RANGE = Symbol( 'OVERLAY_RANGE' );
const OVERLAY_LEVEL = Symbol( 'OVERLAY_LEVEL' );

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();
const _point = [ 0, 0 ];

/**
 * Plugin that generates tiled surface geometry from a tiling scheme, optionally loading
 * image overlay data.
 *
 * The tiling scheme and projection are derived from a provided overlay.
 * If the source's projection is cartographic (any EPSG scheme), the plugin supports
 * both planar and ellipsoidal geometry via the `projection` option.
 *
 * @param {Object} [options]
 * @param {ImageOverlay} [options.overlay=null] Overlay instance to derive the tiling scheme from. When `applyOverlayTexture` is enabled, also used to texture the generated tile meshes.
 * @param {('ellipsoid'|'source'|string)} [options.projection='ellipsoid'] Display the tiles on the
 *   ellipsoid, on a plane in the source projection, or on a plane in the named projection scheme.
 * @param {boolean} [options.endCaps=true] For Mercator ellipsoid mode, snap poles to ±90° lat.
 * @param {boolean} [options.center=true] Shift planar tiles so the image is centered at origin.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended TilesRenderer settings.
 * @param {boolean} [options.applyOverlayTexture=false] Whether to apply the overlay's texture to the generated tile meshes.
 */
export class GeneratedSurfacePlugin {

	// Deprecated: use "projection" instead
	get shape() {

		console.warn( 'GeneratedSurfacePlugin: "shape" is deprecated. Use "projection" instead.' );
		return this.projection === 'ellipsoid' ? 'ellipsoid' : 'planar';

	}

	set shape( v ) {

		console.warn( 'GeneratedSurfacePlugin: "shape" is deprecated. Use "projection" instead.' );
		this.projection = v === 'planar' ? 'source' : 'ellipsoid';

	}

	constructor( options = {} ) {

		const {
			overlay = null,
			shape = null,
			projection = null,
			endCaps = true,
			center = true,
			useRecommendedSettings = true,
			applyOverlayTexture = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.projection = projection ?? 'ellipsoid';
		if ( shape !== null ) {

			console.warn( 'GeneratedSurfacePlugin: "shape" is deprecated. Use "projection" instead.' );
			if ( projection === null ) {

				this.projection = shape === 'planar' ? 'source' : 'ellipsoid';

			}

		}

		this.endCaps = endCaps;
		this.center = center;
		this.useRecommendedSettings = useRecommendedSettings;
		this.applyOverlayTexture = applyOverlayTexture;

		this._tiling = null;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		this.tiles = tiles;

	}

	async loadRootTileset() {

		const { overlay } = this;
		if ( overlay ) {

			await overlay.init();
			this._tiling = overlay.tiling || this._createDefaultTiling();

		} else {

			this._tiling = this._createDefaultTiling();

		}

		// The tiling always comes from the data source. The surface embeds the display projection's
		// normalized space in the local frame and all planar geometry flows through it.
		const { projection } = this;
		const displayProjection = projection === 'ellipsoid' || projection === 'source'
			? this._tiling.projection
			: new ProjectionScheme( projection );

		let planeAspect;
		if ( displayProjection.isCartographic ) {

			const [ extentX, extentY ] = displayProjection.getProjectedExtents();
			planeAspect = extentX / extentY;

		} else {

			planeAspect = this._tiling.aspectRatio;

		}

		// register the surface so image overlays and other consumers can map between cartographic
		// values and the planar frame
		const useEllipsoid = displayProjection.isCartographic && this.projection === 'ellipsoid';
		if ( ! useEllipsoid ) {

			const surface = new ProjectedSurface( displayProjection );
			surface.scale.set( planeAspect, 1 );
			if ( this.center ) {

				surface.offset.set( - planeAspect / 2, - 0.5 );

			}

			this.tiles.surface = surface;

		}

		return this.getTileset();

	}

	async parseToMesh( buffer, tile, extension, url, abortSignal ) {

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		const res = this._createSurfaceMesh( tile );

		const { overlay, applyOverlayTexture } = this;
		if ( overlay && applyOverlayTexture ) {

			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			const level = tile[ TILE_LEVEL ];
			const range = this._tiling.getTileBounds( x, y, level, true, false );

			if ( overlay.hasContent( range, level ) ) {

				try {

					await overlay.lockTexture( range, level );

				} catch ( err ) {

					if ( err.name !== 'AbortError' ) {

						throw err;

					}

					return null;

				}

				const texture = overlay.getTexture( range, level );
				tile[ OVERLAY_RANGE ] = range;
				tile[ OVERLAY_LEVEL ] = level;

				if ( abortSignal.aborted ) {

					overlay.releaseTexture( range, level );
					delete tile[ OVERLAY_RANGE ];
					delete tile[ OVERLAY_LEVEL ];
					return null;

				}

				res.material.map = texture;
				res.material.needsUpdate = true;

			}

		}

		return res;

	}

	preprocessNode( tile ) {

		const tiling = this._tiling;
		const maxLevel = tiling.maxLevel;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel && tile.parent !== null ) {

			this.expandChildren( tile );

		}

	}

	disposeTile( tile ) {

		const range = tile[ OVERLAY_RANGE ];
		if ( this.overlay && range ) {

			this.overlay.releaseTexture( range, tile[ OVERLAY_LEVEL ] );
			delete tile[ OVERLAY_RANGE ];
			delete tile[ OVERLAY_LEVEL ];

		}

	}

	dispose() {

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

	}

	// Deprecated: use "TilesRenderer.surface" instead
	getCartographicFromPosition( position, target = {} ) {

		console.warn( 'GeneratedSurfacePlugin: "getCartographicFromPosition" is deprecated. Use "TilesRenderer.surface" instead.' );
		return this.tiles.surface.getPositionToCartographic( position, target );

	}

	// Deprecated: use "TilesRenderer.surface" instead
	getPositionFromCartographic( lat, lon, target = new Vector3() ) {

		console.warn( 'GeneratedSurfacePlugin: "getPositionFromCartographic" is deprecated. Use "TilesRenderer.surface" instead.' );
		return this.tiles.surface.getCartographicToPosition( lat, lon, 0, target );

	}

	_createSurfaceMesh( tile ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { surface } = tiles;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		// new geometry
		// default to a minimum number of vertices per degree on each axis
		const [ west, south, east, north ] = tiling.getTileBounds( x, y, level );
		const latVerts = Math.max( MIN_LAT_VERTS, Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 ) );
		const lonVerts = Math.max( MIN_LON_VERTS, Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 ) );
		const cols = lonVerts + 3;
		const rows = latVerts + 3;
		const geometry = new PlaneGeometry( 1, 1, lonVerts + 2, latVerts + 2 );

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );
		const uvRange = tiling.getTileContentUVBounds( x, y, level );

		// skip the pole snapping when the displayed projection cannot represent the poles
		const snapToPoles = endCaps && ! ( surface.projection && surface.projection.isMercator );

		// adjust the geometry to position it on the surface
		const { position, normal, uv } = geometry.attributes;
		const vertCount = position.count;
		tile.engineData.boundingVolume.getSphere( _sphere );
		for ( let i = 0; i < vertCount; i ++ ) {

			// determine whether this vertex is part of the skirt or not
			const col = i % cols;
			const row = Math.floor( i / cols );
			const isSkirt = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;

			const innerCol = Math.max( 1, Math.min( cols - 2, col ) );
			const innerRow = Math.max( 1, Math.min( rows - 2, row ) );
			const uNorm = ( innerCol - 1 ) / lonVerts;
			const vNorm = 1 - ( innerRow - 1 ) / latVerts;

			const nU = MathUtils.mapLinear( uNorm, 0, 1, minU, maxU );
			const nV = MathUtils.mapLinear( vNorm, 0, 1, minV, maxV );

			let normU = nU;
			let normV = nV;
			if ( projection.isCartographic ) {

				// convert the plane position to lat / lon
				const cart = projection.fromNormalizedToCartographic( nU, nV, _point );
				const lon = cart[ 0 ];
				let lat = cart[ 1 ];

				// snap edges to poles for Mercator to avoid seams
				if ( projection.isMercator && snapToPoles ) {

					if ( maxV === 1 && vNorm === 1 ) {

						lat = Math.PI / 2;

					}

					if ( minV === 0 && vNorm === 0 ) {

						lat = - Math.PI / 2;

					}

				}

				// ensure we have an edge loop positioned at the mercator limit to avoid UV distortion
				// as much as possible at low LoDs.
				if ( projection.isMercator && vNorm !== 0 && vNorm !== 1 ) {

					const latLimit = projection.fromNormalizedToCartographic( 0.5, 1, _point )[ 1 ];
					const vStep = 1 / latVerts;
					const prevLat = MathUtils.mapLinear( vNorm - vStep, 0, 1, south, north );
					const nextLat = MathUtils.mapLinear( vNorm + vStep, 0, 1, south, north );

					if ( lat > latLimit && prevLat < latLimit ) {

						lat = latLimit;

					}

					if ( lat < - latLimit && nextLat > - latLimit ) {

						lat = - latLimit;

					}

				}

				// get the position and normal
				surface.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
				surface.getCartographicToNormal( lat, lon, _norm );

				// derive UV from the final (potentially adjusted) lat/lon so the overlay samples correctly
				projection.fromCartographicToNormalized( lon, lat, _point );
				normU = _point[ 0 ];
				normV = _point[ 1 ];

			} else {

				// non-cartographic sources map directly onto the plane
				surface.getNormalizedToPosition( nU, nV, 0, _pos ).sub( _sphere.center );
				surface.getCartographicToNormal( 0, 0, _norm );

			}

			if ( isSkirt ) {

				_pos.addScaledVector( _norm, - tile.geometricError );

			}

			const u = MathUtils.mapLinear( normU, minU, maxU, uvRange[ 0 ], uvRange[ 2 ] );
			const v = MathUtils.mapLinear( normV, minV, maxV, uvRange[ 1 ], uvRange[ 3 ] );

			// update the geometry
			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, u, v );

		}

		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.copy( _sphere.center );
		return mesh;

	}

	getTileset() {

		const { tiles, _tiling: tiling } = this;
		const minLevel = tiling.minLevel;
		const { tileCountX, tileCountY } = tiling.getLevel( minLevel );

		const children = [];
		for ( let x = 0; x < tileCountX; x ++ ) {

			for ( let y = 0; y < tileCountY; y ++ ) {

				const child = this.createChild( x, y, minLevel );
				if ( child !== null ) {

					children.push( child );

				}

			}

		}

		// generate tileset
		const tileset = {
			asset: { version: '1.1' },
			geometricError: Infinity,
			root: {
				refine: 'REPLACE',
				geometricError: Infinity,
				boundingVolume: this.createBoundingVolume( 0, 0, - 1 ),
				children,

				[ TILE_LEVEL ]: - 1,
				[ TILE_X ]: 0,
				[ TILE_Y ]: 0,
			},
		};

		tiles.preprocessTileset( tileset, '' );
		return tileset;

	}

	getUrl( /* x, y, level */ ) {

		return 'tile.generated_surface';

	}

	fetchData( url ) {

		if ( /generated_surface/.test( url ) ) {

			return new ArrayBuffer();

		}

	}

	createBoundingVolume( x, y, level, regionHeight = 0 ) {

		const { _tiling: tiling, endCaps } = this;
		const { surface } = this.tiles;

		const isRoot = level === - 1;
		if ( surface.isEllipsoid ) {

			let normalizedBounds;
			let cartBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );
				cartBounds = tiling.getContentBounds();

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true, true );
				cartBounds = tiling.getTileBounds( x, y, level, false, true );

			}

			if ( endCaps ) {

				if ( normalizedBounds[ 3 ] === 1 ) {

					cartBounds[ 3 ] = Math.PI / 2;

				}

				if ( normalizedBounds[ 1 ] === 0 ) {

					cartBounds[ 1 ] = - Math.PI / 2;

				}

			}

			return { region: [ ...cartBounds, - regionHeight, 1 ] };

		} else {

			let normalizedBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true );

			}

			// Compute the plane bounds of the projected tile rect. Non-separable projections are
			// widest at the row nearest the equator so it is sampled in addition to the corners.
			const [ minX, minY, maxX, maxY ] = normalizedBounds;
			const equatorV = MathUtils.clamp( tiling.projection.fromCartographicToNormalized( 0, 0, _point )[ 1 ], minY, maxY );

			let bMinX = Infinity;
			let bMinY = Infinity;
			let bMaxX = - Infinity;
			let bMaxY = - Infinity;
			for ( const v of [ minY, maxY, equatorV ] ) {

				for ( const u of [ minX, maxX ] ) {

					if ( tiling.projection.isCartographic ) {

						// snap the edges of a pole-limited tiling to the poles to match the mesh
						const [ lon, lat ] = tiling.projection.fromNormalizedToCartographic( u, v, _point );
						let cappedLat = lat;
						if ( endCaps && ! surface.projection.isMercator ) {

							if ( v === 1 ) {

								cappedLat = Math.PI / 2;

							}

							if ( v === 0 ) {

								cappedLat = - Math.PI / 2;

							}

						}

						surface.getCartographicToPosition( cappedLat, lon, 0, _pos );

					} else {

						// non-cartographic sources map directly onto the plane
						surface.getNormalizedToPosition( u, v, 0, _pos );

					}

					bMinX = Math.min( bMinX, _pos.x );
					bMinY = Math.min( bMinY, _pos.y );
					bMaxX = Math.max( bMaxX, _pos.x );
					bMaxY = Math.max( bMaxY, _pos.y );

				}

			}

			// return bounding box
			const boundingVolume = {
				box: [
					// center
					( bMinX + bMaxX ) / 2, ( bMinY + bMaxY ) / 2, 0,

					// x, y, z half extents
					( bMaxX - bMinX ) / 2, 0.0, 0.0,
					0.0, ( bMaxY - bMinY ) / 2, 0.0,
					0.0, 0.0, 0.0,
				],
			};

			// The cartographic range covered by the tile as [ west, south, east, north ] in radians,
			// read by consumers like image overlays in place of a "region" volume. Ignored by the
			// tiles renderer itself.
			if ( tiling.projection.isCartographic ) {

				boundingVolume.cartographicRange = isRoot ? tiling.getContentBounds() : tiling.getTileBounds( x, y, level );

			}

			return boundingVolume;

		}

	}

	createChild( x, y, level ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		let geometricError;
		const { surface } = this.tiles;
		const useRegions = surface.isEllipsoid;
		if ( useRegions ) {

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
			const midV = projection.fromCartographicToNormalized( 0, midLat, _point )[ 1 ];
			const [ lonFactor, latFactor ] = projection.getDerivativeAtNormalizedPoint( minU, midV, _point );

			// calculate the size of a pixel on the surface
			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		} else {

			// Size of one pixel in world space. The tile contents span the surface scale.
			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( surface.scale.x / pixelWidth, surface.scale.y / pixelHeight );

		}

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level, useRegions ? geometricError : 0 ),
			content: {
				uri: this.getUrl( x, y, level ),
			},
			children: [],

			// save the tile params so we can expand later
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			[ TILE_LEVEL ]: level,
		};

	}

	expandChildren( tile ) {

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const { tileSplitX, tileSplitY } = this._tiling.getLevel( level );
		for ( let cx = 0; cx < tileSplitX; cx ++ ) {

			for ( let cy = 0; cy < tileSplitY; cy ++ ) {

				const child = this.createChild( tileSplitX * x + cx, tileSplitY * y + cy, level + 1 );
				if ( child ) {

					tile.children.push( child );

				}

			}

		}

	}

	_createDefaultTiling() {

		const tiling = new TilingScheme();
		if ( this.projection === 'ellipsoid' ) {

			const projection = new ProjectionScheme( 'EPSG:3857' );
			tiling.setProjection( projection );
			tiling.generateLevels( DEFAULT_LEVELS, projection.tileCountX, projection.tileCountY );

		} else {

			const projection = new ProjectionScheme( 'none' );
			tiling.setProjection( projection );
			tiling.generateLevels( DEFAULT_LEVELS, 1, 1 );

		}

		return tiling;

	}

}
