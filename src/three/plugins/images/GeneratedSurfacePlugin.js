/** @import { TiledImageOverlay } from './ImageOverlayPlugin.js' */
import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, Vector3, Sphere } from 'three';
import { TILE_X, TILE_Y, TILE_LEVEL } from './ImageFormatPlugin.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';
import { TilingScheme } from './utils/TilingScheme.js';
import { ProjectionScheme } from './utils/ProjectionScheme.js';

const MIN_LON_VERTS = 30;
const MIN_LAT_VERTS = 15;
const DEFAULT_LEVELS = 20;

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();

/**
 * Plugin that generates tiled surface geometry from a tiling scheme, without loading
 * any image data. Intended to be paired with `ImageOverlayPlugin` which handles
 * image fetching and texturing separately.
 *
 * The tiling scheme and projection are derived from a provided overlay or image source.
 * If the source's projection is cartographic (any EPSG scheme), the plugin supports
 * both planar and ellipsoidal geometry via the `shape` option.
 *
 * @param {Object} [options]
 * @param {TiledImageOverlay} [options.overlay=null] Overlay instance to derive the tiling scheme from.
 * @param {string} [options.shape='planar'] Geometry shape: `'planar'` or `'ellipsoid'`. Only
 *   meaningful for cartographic sources.
 * @param {boolean} [options.endCaps=true] For Mercator ellipsoid mode, snap poles to ±90° lat.
 * @param {boolean} [options.center=true] Shift planar tiles so the image is centered at origin.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended TilesRenderer settings.
 */
export class GeneratedSurfacePlugin {

	constructor( options = {} ) {

		// TODO:
		// - defaults to a basic quad, equirect surface otherwise
		// - need a target projection for planar definitions? How can we display the tiled
		// carto image set as it's original aspect / projection? Separate option?

		const {
			overlay = null,
			shape = 'planar',
			endCaps = true,
			center = true,
			useRecommendedSettings = true,
			transparent = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.shape = shape;
		this.endCaps = endCaps;
		this.center = center;
		this.transparent = transparent;
		this.useRecommendedSettings = useRecommendedSettings;

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

		const { tiles, overlay } = this;
		if ( overlay ) {

			const { imageSource } = overlay;
			imageSource.url = imageSource.url || tiles.rootURL;
			tiles.invokeAllPlugins( plugin => imageSource.url = plugin.preprocessURL ? plugin.preprocessURL( imageSource.url, null ) : imageSource.url );

			// overlay.init() initializes the image source and creates regionImageSource
			await overlay.init();

			this._tiling = overlay.tiling;
			tiles.rootURL = imageSource.url;
			return this.getTileset( imageSource.url );

		} else {

			this._tiling = this._createDefaultTiling();
			return this.getTileset( tiles.rootURL );

		}

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		const { transparent, overlay } = this;
		let res;
		if ( this._useEllipsoid() ) {

			res = this._createEllipsoidMesh( tile );

		} else {

			res = this._createPlanarMesh( tile );

		}

		res.material.transparent = transparent;

		if ( overlay ) {

			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			const level = tile[ TILE_LEVEL ];
			const range = this._tiling.getTileBounds( x, y, level, true, true );

			await overlay.lockTexture( range );

			if ( abortSignal.aborted ) {

				overlay.releaseTexture( range );
				return null;

			}

			tile.overlayRange = range;

			if ( overlay.hasContent( range ) ) {

				const texture = await overlay.getTexture( range );

				if ( abortSignal.aborted ) {

					overlay.releaseTexture( range );
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

		const { overlayRange } = tile;
		if ( this.overlay && overlayRange ) {

			this.overlay.releaseTexture( overlayRange );

		}

	}

	_useEllipsoid() {

		return this._tiling.projection.isCartographic && this.shape === 'ellipsoid';

	}

	// Local functions
	_createPlanarMesh( tile ) {

		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1, x = 0, y = 0, z = 0;
		if ( boundingBox ) {

			[ x, y, z ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		const geometry = new PlaneGeometry( 2 * sx, 2 * sy );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.set( x, y, z );

		const uvRange = this._tiling.getTileContentUVBounds( tx, ty, level );
		const { uv } = geometry.attributes;
		for ( let i = 0; i < uv.count; i ++ ) {

			uv.setXY( i,
				MathUtils.mapLinear( uv.getX( i ), 0, 1, uvRange[ 0 ], uvRange[ 2 ] ),
				MathUtils.mapLinear( uv.getY( i ), 0, 1, uvRange[ 1 ], uvRange[ 3 ] ),
			);

		}

		return mesh;

	}

	_createEllipsoidMesh( tile ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ west, south, east, north ] = tile.boundingVolume.region;
		const latVerts = Math.max( MIN_LAT_VERTS, Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 ) );
		const lonVerts = Math.max( MIN_LON_VERTS, Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 ) );
		const cols = lonVerts + 3;
		const rows = latVerts + 3;
		const geometry = new PlaneGeometry( 1, 1, lonVerts + 2, latVerts + 2 );

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		const { position, normal, uv } = geometry.attributes;
		const vertCount = position.count;
		tile.engineData.boundingVolume.getSphere( _sphere );

		for ( let i = 0; i < vertCount; i ++ ) {

			const col = i % cols;
			const row = Math.floor( i / cols );
			const isSkirt = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;

			const innerCol = Math.max( 1, Math.min( cols - 2, col ) );
			const innerRow = Math.max( 1, Math.min( rows - 2, row ) );
			const uNorm = ( innerCol - 1 ) / lonVerts;
			const vNorm = 1 - ( innerRow - 1 ) / latVerts;

			const lon = projection.convertNormalizedToLongitude( MathUtils.mapLinear( uNorm, 0, 1, minU, maxU ) );
			let lat = projection.convertNormalizedToLatitude( MathUtils.mapLinear( vNorm, 0, 1, minV, maxV ) );

			// snap edges to poles for Mercator to avoid seams
			if ( projection.isMercator && endCaps ) {

				if ( maxV === 1 && vNorm === 1 ) lat = Math.PI / 2;
				if ( minV === 0 && vNorm === 0 ) lat = - Math.PI / 2;

			}

			// insert edge loop at Mercator lat limit to reduce UV distortion at low LoDs
			if ( projection.isMercator && vNorm !== 0 && vNorm !== 1 ) {

				const latLimit = projection.convertNormalizedToLatitude( 1 );
				const vStep = 1 / latVerts;
				const prevLat = MathUtils.mapLinear( vNorm - vStep, 0, 1, south, north );
				const nextLat = MathUtils.mapLinear( vNorm + vStep, 0, 1, south, north );

				if ( lat > latLimit && prevLat < latLimit ) lat = latLimit;
				if ( lat < - latLimit && nextLat > - latLimit ) lat = - latLimit;

			}

			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			if ( isSkirt ) {

				_pos.addScaledVector( _norm, - tile.geometricError );

			}

			// derive UV from the final (potentially adjusted) lat/lon so the overlay samples correctly
			const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, 0, 1 );
			const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, 0, 1 );

			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, u, v );

		}

		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.copy( _sphere.center );
		return mesh;

	}

	getTileset( baseUrl ) {

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

		tiles.preprocessTileset( tileset, baseUrl );
		return tileset;

	}

	getUrl( /* x, y, level */ ) {

		return 'tile.generated_surface';

	}

	fetchData( uri ) {

		if ( /generated_surface/.test( uri ) ) {

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

			const { center } = this;
			let normalizedBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true );

			}

			const [ minX, minY, maxX, maxY ] = normalizedBounds;
			let extentsX = ( maxX - minX ) / 2;
			let extentsY = ( maxY - minY ) / 2;
			let centerX = minX + extentsX;
			let centerY = minY + extentsY;

			if ( center ) {

				centerX -= 0.5;
				centerY -= 0.5;

			}

			centerX *= tiling.aspectRatio;
			extentsX *= tiling.aspectRatio;

			return {
				box: [
					// center
					centerX, centerY, 0,

					// x, y, z half extents
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
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

			const tileUWidth = ( maxU - minU ) / tilePixelWidth;
			const tileVWidth = ( maxV - minV ) / tilePixelHeight;

			const [ , south, east, north ] = tiling.getTileBounds( x, y, level );
			const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
			const midV = projection.convertLatitudeToNormalized( midLat );
			const lonFactor = projection.getLongitudeDerivativeAtNormalized( minU );
			const latFactor = projection.getLatitudeDerivativeAtNormalized( midV );

			const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
			geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		} else {

			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

		}

		return {
			refine: 'REPLACE',
			geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level, useRegions ? geometricError : 0 ),
			content: {
				uri: this.getUrl( x, y, level ),
			},
			children: [],

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
		if ( this.shape === 'ellipsoid' ) {

			const projection = new ProjectionScheme( 'EPSG:4326' );
			tiling.setProjection( projection );
			tiling.setContentBounds( ...projection.getBounds() );
			tiling.generateLevels( DEFAULT_LEVELS, projection.tileCountX, projection.tileCountY );

		} else {

			const projection = new ProjectionScheme( 'none' );
			tiling.setProjection( projection );
			tiling.setContentBounds( ...projection.getBounds() );
			tiling.generateLevels( DEFAULT_LEVELS, 1, 1 );

		}

		return tiling;

	}

}
