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
const PLANAR_SEGMENTS = 64;

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
 * @param {string} [options.shape] Deprecated: use `projection` instead.
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
		this._surface = null;

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

		const surface = new ProjectedSurface( displayProjection );
		surface.scale.set( planeAspect, 1 );
		if ( this.center ) {

			surface.offset.set( - planeAspect / 2, - 0.5 );

		}

		this._surface = surface;

		// register the surface so image overlays and other consumers can map between cartographic
		// values and the planar frame
		if ( displayProjection.isCartographic && ! this._useEllipsoid() ) {

			this.tiles.surface = surface;

		}

		return this.getTileset();

	}

	async parseToMesh( buffer, tile, extension, url, abortSignal ) {

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		let res;
		if ( this._useEllipsoid() ) {

			res = this._createEllipsoidMesh( tile );

		} else {

			res = this._createPlanarMesh( tile );

		}

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

		// restore the default surface if this plugin assigned a flattened one
		const { tiles } = this;
		if ( tiles.surface.isProjectedSurface ) {

			tiles.surface = tiles.ellipsoid;

		}

		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

	}

	/**
	 * Returns the cartographic coordinates for a given world-space position. "lat" and "lon" are assigned
	 * to the target object.
	 * @param {Vector3} position - World-space position. For ellipsoid surfaces this is a
	 * 3D point on the surface; for planar surfaces it is a 2D point in the plane.
	 * @param {{ lat: number, lon: number }} [target={}] - Optional target object to write results into.
	 * @returns {{ lat: number, lon: number }} The cartographic coordinates in radians.
	 * @throws {Error} If the tiling projection is not cartographic.
	 */
	getCartographicFromPosition( position, target = {} ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;

		if ( ! projection.isCartographic ) {

			throw new Error( 'GeneratedSurfacePlugin: getCartographicFromPosition requires a cartographic projection.' );

		}

		return this.tiles.surface.getPositionToCartographic( position, target );

	}

	/**
	 * Returns the world-space position for a given cartographic coordinate.
	 * @param {number} lat - Latitude in radians.
	 * @param {number} lon - Longitude in radians.
	 * @param {Vector3} [target=new Vector3()] - Optional target Vector3 to write results into.
	 * @returns {Vector3} The world-space position. For planar surfaces z is set to 0.
	 * @throws {Error} If the tiling projection is not cartographic.
	 */
	getPositionFromCartographic( lat, lon, target = new Vector3() ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;

		if ( ! projection.isCartographic ) {

			throw new Error( 'GeneratedSurfacePlugin: getPositionFromCartographic requires a cartographic projection.' );

		}

		return this.tiles.surface.getCartographicToPosition( lat, lon, 0, target );

	}

	// whether the plugin is loading as an ellipsoid or not
	_useEllipsoid() {

		return this._tiling.projection.isCartographic && this.projection === 'ellipsoid';

	}

	_createPlanarMesh( tile ) {

		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const { _tiling: tiling } = this;

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( tx, ty, level, true, true );
		const uvRange = tiling.getTileContentUVBounds( tx, ty, level );

		// lay the grid vertices out over the tile's normalized rect and transform them by the
		// display projection so the tiles take the shape of the projected map
		const geometry = new PlaneGeometry( 1, 1, PLANAR_SEGMENTS, PLANAR_SEGMENTS );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		const { position, uv } = geometry.attributes;
		for ( let i = 0; i < position.count; i ++ ) {

			const fu = uv.getX( i );
			const fv = uv.getY( i );

			this._normalizedToPlane(
				MathUtils.lerp( minU, maxU, fu ),
				MathUtils.lerp( minV, maxV, fv ),
				_pos,
			);
			position.setXYZ( i, _pos.x, _pos.y, 0 );

			// adjust the uvs so only the relevant texture portion is visible
			uv.setXY( i,
				MathUtils.mapLinear( fu, 0, 1, uvRange[ 0 ], uvRange[ 2 ] ),
				MathUtils.mapLinear( fv, 0, 1, uvRange[ 1 ], uvRange[ 3 ] ),
			);

		}

		return mesh;

	}

	// Returns the cartographic range covered by a generated planar tile. Ellipsoid tiles carry
	// the same information in their region bounding volumes.
	getTileCartographicRange( tile ) {

		if ( this._useEllipsoid() || ! this._tiling.projection.isCartographic || ! ( TILE_LEVEL in tile ) ) {

			return null;

		}

		return this._tiling.getTileBounds( tile[ TILE_X ], tile[ TILE_Y ], tile[ TILE_LEVEL ] );

	}

	// maps a point in the tiling's normalized space onto the flattened plane through the surface
	_normalizedToPlane( nu, nv, target ) {

		const { _surface: surface, _tiling: tiling } = this;
		const [ lon, lat ] = tiling.projection.fromNormalizedToCartographic( nu, nv, _point );
		let cappedLat = lat;

		// snap the edges of a pole-limited tiling to the poles so the map is not cut off there
		if ( this.endCaps && tiling.projection.isMercator ) {

			if ( nv === 1 ) cappedLat = Math.PI / 2;
			if ( nv === 0 ) cappedLat = - Math.PI / 2;

		}

		return surface.getCartographicToPosition( cappedLat, lon, 0, target );

	}

	_createEllipsoidMesh( tile ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		// new geometry
		// default to a minimum number of vertices per degree on each axis
		const [ west, south, east, north ] = tile.boundingVolume.region;
		const latVerts = Math.max( MIN_LAT_VERTS, Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 ) );
		const lonVerts = Math.max( MIN_LON_VERTS, Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 ) );
		const cols = lonVerts + 3;
		const rows = latVerts + 3;
		const geometry = new PlaneGeometry( 1, 1, lonVerts + 2, latVerts + 2 );

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );
		const uvRange = tiling.getTileContentUVBounds( x, y, level );

		// adjust the geometry to position it at the region
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

			// convert the plane position to lat / lon
			const cart = projection.fromNormalizedToCartographic(
				MathUtils.mapLinear( uNorm, 0, 1, minU, maxU ),
				MathUtils.mapLinear( vNorm, 0, 1, minV, maxV ),
				_point,
			);
			const lon = cart[ 0 ];
			let lat = cart[ 1 ];

			// snap edges to poles for Mercator to avoid seams
			if ( projection.isMercator && endCaps ) {

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
			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			if ( isSkirt ) {

				_pos.addScaledVector( _norm, - tile.geometricError );

			}

			// derive UV from the final (potentially adjusted) lat/lon so the overlay samples correctly
			const [ normU, normV ] = projection.fromCartographicToNormalized( lon, lat, _point );
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

		const { _tiling: tiling } = this;

		const isRoot = level === - 1;
		if ( this._useEllipsoid() ) {

			const { endCaps } = this;

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

				if ( normalizedBounds[ 3 ] === 1 ) cartBounds[ 3 ] = Math.PI / 2;
				if ( normalizedBounds[ 1 ] === 0 ) cartBounds[ 1 ] = - Math.PI / 2;

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

					this._normalizedToPlane( u, v, _pos );
					bMinX = Math.min( bMinX, _pos.x );
					bMinY = Math.min( bMinY, _pos.y );
					bMaxX = Math.max( bMaxX, _pos.x );
					bMaxY = Math.max( bMaxY, _pos.y );

				}

			}

			// return bounding box
			return {
				box: [
					// center
					( bMinX + bMaxX ) / 2, ( bMinY + bMaxY ) / 2, 0,

					// x, y, z half extents
					( bMaxX - bMinX ) / 2, 0.0, 0.0,
					0.0, ( bMaxY - bMinY ) / 2, 0.0,
					0.0, 0.0, 0.0,
				],
			};

		}

	}

	createChild( x, y, level ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		let geometricError;
		const useRegions = this._useEllipsoid();
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
			const { scale } = this._surface;
			geometricError = Math.max( scale.x / pixelWidth, scale.y / pixelHeight );

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
