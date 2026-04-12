import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, Vector2, Vector3, Sphere } from 'three';
import { TILE_X, TILE_Y, TILE_LEVEL } from './ImageFormatPlugin.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

const MIN_LON_VERTS = 30;
const MIN_LAT_VERTS = 15;

const _uv = /* @__PURE__ */ new Vector2();
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
 * @param {Object} [options.overlay=null] Overlay instance to derive the image source from.
 * @param {Object} [options.imageSource=null] Image source providing tiling metadata directly.
 * @param {string} [options.shape='planar'] Geometry shape: `'planar'` or `'ellipsoid'`. Only
 *   meaningful for cartographic sources.
 * @param {boolean} [options.endCaps=true] For Mercator ellipsoid mode, snap poles to ±90° lat.
 * @param {boolean} [options.center=false] Shift planar tiles so the image is centered at origin.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended TilesRenderer settings.
 */
export class GeneratedSurfacePlugin {

	get tiling() {

		return this.imageSource.tiling;

	}

	get projection() {

		return this.tiling.projection;

	}

	constructor( options = {} ) {

		const {
			overlay = null,
			imageSource = null,
			shape = 'planar',
			endCaps = true,
			center = false,
			useRecommendedSettings = true,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.imageSource = imageSource || ( overlay ? overlay.imageSource : null );
		this.shape = shape;
		this.endCaps = endCaps;
		this.center = center;
		this.useRecommendedSettings = useRecommendedSettings;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		this.tiles = tiles;

		const { imageSource } = this;
		if ( imageSource ) {

			imageSource.fetchOptions = tiles.fetchOptions;
			imageSource.fetchData = ( url, options ) => {

				tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
				return tiles.invokeOnePlugin( plugin => plugin !== this && plugin.fetchData && plugin.fetchData( url, options ) );

			};

		}

	}

	async loadRootTileset() {

		const { tiles, imageSource } = this;
		imageSource.url = imageSource.url || tiles.rootURL;
		tiles.invokeAllPlugins( plugin => imageSource.url = plugin.preprocessURL ? plugin.preprocessURL( imageSource.url, null ) : imageSource.url );
		await imageSource.init();

		tiles.rootURL = imageSource.url;
		return this.getTileset( imageSource.url );

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		const { shape, projection } = this;
		if ( projection.isCartographic && shape === 'ellipsoid' ) {

			return this._createEllipsoidMesh( tile );

		} else {

			return this._createPlanarMesh( tile );

		}

	}

	preprocessNode( tile ) {

		const { tiling } = this;
		const maxLevel = tiling.maxLevel;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel && tile.parent !== null ) {

			this.expandChildren( tile );

		}

	}

	disposeTile( /* tile */ ) {

		// No texture data to release — geometry is managed by the renderer

	}

	// Local functions
	_createPlanarMesh( tile ) {

		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1, x = 0, y = 0, z = 0;
		if ( boundingBox ) {

			[ x, y, z ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		const geometry = new PlaneGeometry( 2 * sx, 2 * sy );
		const mesh = new Mesh( geometry, new MeshBasicMaterial( { transparent: true, opacity: 0, depthWrite: false } ) );
		mesh.position.set( x, y, z );
		return mesh;

	}

	_createEllipsoidMesh( tile ) {

		const { projection, tiling, tiles, endCaps } = this;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ west, south, east, north ] = tile.boundingVolume.region;
		const latVerts = Math.max( MIN_LAT_VERTS, Math.ceil( ( north - south ) * MathUtils.RAD2DEG * 0.25 ) );
		const lonVerts = Math.max( MIN_LON_VERTS, Math.ceil( ( east - west ) * MathUtils.RAD2DEG * 0.25 ) );
		const geometry = new PlaneGeometry( 1, 1, lonVerts, latVerts );

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		const { position, normal, uv } = geometry.attributes;
		const vertCount = position.count;
		tile.engineData.boundingVolume.getSphere( _sphere );

		for ( let i = 0; i < vertCount; i ++ ) {

			_uv.fromBufferAttribute( uv, i );

			const lon = projection.convertNormalizedToLongitude( MathUtils.mapLinear( _uv.x, 0, 1, minU, maxU ) );
			let lat = projection.convertNormalizedToLatitude( MathUtils.mapLinear( _uv.y, 0, 1, minV, maxV ) );

			// snap edges to poles for Mercator to avoid seams
			if ( projection.isMercator && endCaps ) {

				if ( maxV === 1 && _uv.y === 1 ) lat = Math.PI / 2;
				if ( minV === 0 && _uv.y === 0 ) lat = - Math.PI / 2;

			}

			// insert edge loop at Mercator lat limit to reduce UV distortion at low LoDs
			if ( projection.isMercator && _uv.y !== 0 && _uv.y !== 1 ) {

				const latLimit = projection.convertNormalizedToLatitude( 1 );
				const vStep = 1 / latVerts;
				const prevLat = MathUtils.mapLinear( _uv.y - vStep, 0, 1, south, north );
				const nextLat = MathUtils.mapLinear( _uv.y + vStep, 0, 1, south, north );

				if ( lat > latLimit && prevLat < latLimit ) lat = latLimit;
				if ( lat < - latLimit && nextLat > - latLimit ) lat = - latLimit;

			}

			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );

		}

		const mesh = new Mesh( geometry, new MeshBasicMaterial( { transparent: true, opacity: 0, depthWrite: false } ) );
		mesh.position.copy( _sphere.center );
		return mesh;

	}

	getTileset( baseUrl ) {

		const { tiling, tiles } = this;
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

	createBoundingVolume( x, y, level ) {

		const { shape, tiling, projection } = this;

		if ( projection.isCartographic && shape === 'ellipsoid' ) {

			const { endCaps } = this;
			const isRoot = level === - 1;
			const normalizedBounds = isRoot ? tiling.getContentBounds( true ) : tiling.getTileBounds( x, y, level, true, true );
			const cartBounds = isRoot ? tiling.getContentBounds() : tiling.getTileBounds( x, y, level, false, true );

			if ( endCaps ) {

				if ( normalizedBounds[ 3 ] === 1 ) cartBounds[ 3 ] = Math.PI / 2;
				if ( normalizedBounds[ 1 ] === 0 ) cartBounds[ 1 ] = - Math.PI / 2;

			}

			return { region: [ ...cartBounds, - 1, 1 ] };

		} else {

			const { center } = this;
			const [ minX, minY, maxX, maxY ] = level === - 1
				? tiling.getContentBounds( true )
				: tiling.getTileBounds( x, y, level, true );

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
					centerX, centerY, 0,
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
					0.0, 0.0, 0.0,
				],
			};

		}

	}

	createChild( x, y, level ) {

		const { tiling, shape, projection } = this;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		let geometricError;
		if ( projection.isCartographic && shape === 'ellipsoid' ) {

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
			boundingVolume: this.createBoundingVolume( x, y, level ),
			content: { uri: this.getUrl( x, y, level ) },
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

		const { tileSplitX, tileSplitY } = this.tiling.getLevel( level );
		for ( let cx = 0; cx < tileSplitX; cx ++ ) {

			for ( let cy = 0; cy < tileSplitY; cy ++ ) {

				const child = this.createChild( tileSplitX * x + cx, tileSplitY * y + cy, level + 1 );
				if ( child ) {

					tile.children.push( child );

				}

			}

		}

	}

}
