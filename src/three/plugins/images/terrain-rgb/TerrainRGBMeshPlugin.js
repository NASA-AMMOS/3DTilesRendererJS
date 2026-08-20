/** @import { ImageOverlay } from '../ImageOverlayPlugin.js' */
import {
	Mesh,
	MeshLambertMaterial,
	MathUtils,
	Vector3,
	Sphere,
} from 'three';
import { XYZImageSource } from '../sources/XYZImageSource.js';
import { getCartographicToMeterDerivative } from '../utils/getCartographicToMeterDerivative.js';
import { SkirtedPlaneGeometry } from './SkirtedPlaneGeometry.js';
import { GridCache } from './GridCache.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
const HEIGHT_GRID = Symbol( 'HEIGHT_GRID' );
const SOURCE_TILE = Symbol( 'SOURCE_TILE' );
const SUBVIEW = Symbol( 'SUBVIEW' );
const OVERLAY_RANGE = Symbol( 'OVERLAY_RANGE' );
const OVERLAY_LEVEL = Symbol( 'OVERLAY_LEVEL' );

// the raw terrain elevation range known for a tile, excluding height scale and skirt depth
const ELEVATION_RANGE = Symbol( 'ELEVATION_RANGE' );

// mesh segments per tile
const MESH_SIZE = 64;

// number of tile tree levels sharing each fetched texture level
const EXTRA_LEVELS = 2;

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();

// bilinear sample of a padded grid at padded texture coordinates
function sampleGrid( grid, tu, tv ) {

	const { data, width, height } = grid.image;
	const fx = MathUtils.clamp( tu * width - 0.5, 0, width - 1 );
	const fy = MathUtils.clamp( tv * height - 0.5, 0, height - 1 );
	const x0 = Math.floor( fx );
	const y0 = Math.floor( fy );
	const x1 = Math.min( x0 + 1, width - 1 );
	const y1 = Math.min( y0 + 1, height - 1 );
	const tx = fx - x0;
	const ty = fy - y0;

	const h0 = data[ y0 * width + x0 ] * ( 1 - tx ) + data[ y0 * width + x1 ] * tx;
	const h1 = data[ y1 * width + x0 ] * ( 1 - tx ) + data[ y1 * width + x1 ] * tx;
	return h0 * ( 1 - ty ) + h1 * ty;

}

/**
 * Generates terrain tiles from raster Terrain-RGB elevation tiles. Each elevation texture is
 * shared by multiple layers of sub tiles that displace a smooth surface mesh on the GPU with a
 * subview of the texture, so elevation scale and seam updates only require texture changes.
 *
 * @param {Object} [options]
 * @param {string} options.url XYZ url template, e.g. `.../{z}/{x}/{y}.png`.
 * @param {number} [options.tileDimension=512] Source tile pixel size.
 * @param {number} [options.maxZoom=15] Highest zoom level the source provides.
 * @param {number} [options.heightScale=1] Vertical exaggeration. Can be adjusted dynamically.
 * @param {ImageOverlay} [options.overlay=null] Overlay used to texture the tiles when
 *   `applyOverlayTexture` is enabled.
 * @param {boolean} [options.applyOverlayTexture=false] Whether to apply the overlay texture.
 * @param {boolean} [options.endCaps=true] Snap poles to ±90° lat.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended TilesRenderer settings.
 */
export class TerrainRGBMeshPlugin {

	get heightScale() {

		return this._heightScale;

	}

	set heightScale( value ) {

		if ( value !== this._heightScale ) {

			this._heightScale = value;
			this._updateHeightScale();

		}

	}

	constructor( options = {} ) {

		const {
			url = null,
			tileDimension = 512,
			maxZoom = 15,
			heightScale = 1,
			overlay = null,
			applyOverlayTexture = false,
			endCaps = true,
			useRecommendedSettings = true,
		} = options;

		this.name = 'TERRAIN_RGB_MESH_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.applyOverlayTexture = applyOverlayTexture;
		this.endCaps = endCaps;
		this.useRecommendedSettings = useRecommendedSettings;
		this.maxZoom = maxZoom;

		// number of tile tree levels that share each fetched texture level. Textures are only
		// fetched at levels that are multiples of this, and the levels in between inherit the
		// ancestor texture as subviews.
		this._extraLevels = EXTRA_LEVELS;

		// extend the tree past the last fetched texture level so its subview layers exist, too
		const maxLevel = EXTRA_LEVELS * Math.floor( maxZoom / EXTRA_LEVELS ) + EXTRA_LEVELS - 1;

		this._heightScale = heightScale;
		this._source = new XYZImageSource( { url, tileDimension, levels: maxLevel + 1 } );
		this._gridCache = new GridCache( this );
		this._tiling = null;

	}

	// the source tile holding the texture a tile at the given level reads a subview of
	_getSourceLevel( level ) {

		return this._extraLevels * Math.floor( level / this._extraLevels );

	}

	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		this.tiles = tiles;

	}

	async loadRootTileset() {

		await this._source.init();
		if ( this.overlay ) {

			await this.overlay.init();

		}

		this._tiling = this._source.tiling;
		return this.getTileset();

	}

	async parseToMesh( buffer, tile, extension, url, abortSignal ) {

		if ( tile[ TILE_X ] === undefined ) {

			return null;

		}

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		// find the source tile that this render tile reads a subview of
		const sourceLevel = this._getSourceLevel( level );
		const scale = 2 ** ( level - sourceLevel );
		const sx = Math.floor( x / scale );
		const sy = Math.floor( y / scale );

		// lock the shared elevation grid
		let grid;
		try {

			grid = await this._gridCache.lock( sx, sy, sourceLevel );

		} catch ( err ) {

			if ( err.name !== 'AbortError' ) {

				throw err;

			}

			return null;

		}

		if ( abortSignal.aborted ) {

			this._gridCache.release( sx, sy, sourceLevel );
			return null;

		}

		tile[ HEIGHT_GRID ] = grid;
		tile[ SOURCE_TILE ] = [ sx, sy, sourceLevel ];
		tile[ SUBVIEW ] = this._getSubview( tile );

		// tighten the bounding volume to the subview's elevation range cached at decode
		this._updateBoundingVolume( tile, ...this._getSubviewRange( grid, tile[ SUBVIEW ] ) );

		// build the displaced surface mesh
		const mesh = this._createEllipsoidMesh( tile );
		mesh.geometry.computeBoundingSphere();

		// apply the overlay texture
		const { overlay, applyOverlayTexture } = this;
		if ( overlay && applyOverlayTexture ) {

			const range = this._tiling.getTileBounds( x, y, level, true, false );
			if ( overlay.hasContent( range, level ) ) {

				try {

					await overlay.lockTexture( range, level );

				} catch ( err ) {

					if ( err.name !== 'AbortError' ) {

						throw err;

					}

					this._releaseGrid( tile );
					return null;

				}

				tile[ OVERLAY_RANGE ] = range;
				tile[ OVERLAY_LEVEL ] = level;

				if ( abortSignal.aborted ) {

					overlay.releaseTexture( range, level );
					delete tile[ OVERLAY_RANGE ];
					delete tile[ OVERLAY_LEVEL ];
					this._releaseGrid( tile );
					return null;

				}

				// clone so the tile can apply its own uv transform - the texture upload is shared
				const uvRange = this._tiling.getTileContentUVBounds( x, y, level );
				const texture = overlay.getTexture( range, level ).clone();
				texture.offset.set( uvRange[ 0 ], uvRange[ 1 ] );
				texture.repeat.set( uvRange[ 2 ] - uvRange[ 0 ], uvRange[ 3 ] - uvRange[ 1 ] );

				mesh.material.map = texture;
				mesh.material.needsUpdate = true;

			}

		}

		// assigned after the last await so a height scale change mid-parse cannot leave a stale
		return mesh;

	}

	preprocessNode( tile ) {

		// inherit the parent's elevation range once, before the traversal bounding volume is
		// generated from the tile json. The tile's own range replaces it when its data loads.
		const parent = tile.parent;
		if ( ! tile[ ELEVATION_RANGE ] && parent && parent[ ELEVATION_RANGE ] ) {

			const { min, max } = parent[ ELEVATION_RANGE ];
			this._updateBoundingVolume( tile, min, max, true );

		}

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

		this._releaseGrid( tile );

	}

	_releaseGrid( tile ) {

		const sourceTile = tile[ SOURCE_TILE ];
		if ( sourceTile ) {

			this._gridCache.release( ...sourceTile );
			delete tile[ SOURCE_TILE ];
			delete tile[ HEIGHT_GRID ];
			delete tile[ SUBVIEW ];

		}

	}

	dispose() {

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

		this._gridCache.dispose();

	}

	// normalized bounds of the render tile within its source tile
	_getSubview( tile ) {

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const [ sx, sy, sourceLevel ] = tile[ SOURCE_TILE ];

		const renderBounds = this._tiling.getTileBounds( x, y, level, true );
		const sourceBounds = this._tiling.getTileBounds( sx, sy, sourceLevel, true );
		const invW = 1 / ( sourceBounds[ 2 ] - sourceBounds[ 0 ] );
		const invH = 1 / ( sourceBounds[ 3 ] - sourceBounds[ 1 ] );

		return [
			( renderBounds[ 0 ] - sourceBounds[ 0 ] ) * invW,
			( renderBounds[ 1 ] - sourceBounds[ 1 ] ) * invH,
			( renderBounds[ 2 ] - sourceBounds[ 0 ] ) * invW,
			( renderBounds[ 3 ] - sourceBounds[ 1 ] ) * invH,
		];

	}

	// elevation range over a subview, from the block ranges cached at decode
	_getSubviewRange( grid, subview ) {

		const { blockRanges, blocks } = grid.userData;
		const x0 = MathUtils.clamp( Math.floor( subview[ 0 ] * blocks ), 0, blocks - 1 );
		const x1 = MathUtils.clamp( Math.ceil( subview[ 2 ] * blocks ) - 1, 0, blocks - 1 );
		const y0 = MathUtils.clamp( Math.floor( subview[ 1 ] * blocks ), 0, blocks - 1 );
		const y1 = MathUtils.clamp( Math.ceil( subview[ 3 ] * blocks ) - 1, 0, blocks - 1 );

		let minHeight = Infinity;
		let maxHeight = - Infinity;
		for ( let y = y0; y <= y1; y ++ ) {

			for ( let x = x0; x <= x1; x ++ ) {

				const i = 2 * ( y * blocks + x );
				minHeight = Math.min( minHeight, blockRanges[ i + 0 ] );
				maxHeight = Math.max( maxHeight, blockRanges[ i + 1 ] );

			}

		}

		return [ minHeight, maxHeight ];

	}

	// texture coordinate range of a subview within the padded grid texture. The half texel inset
	// means tile edges sample into the stitched border so both sides of a seam agree.
	_getSubviewUVBounds( grid, subview ) {

		const { width, height } = grid.image;
		const w = width - 2;
		const h = height - 2;
		return [
			( subview[ 0 ] * w + 1 ) / width,
			( subview[ 1 ] * h + 1 ) / height,
			( subview[ 2 ] * w + 1 ) / width,
			( subview[ 3 ] * h + 1 ) / height,
		];

	}

	// clone of the shared grid texture with a transform mapping the tile onto its subview. The
	// texture upload is shared between clones.
	_createSubviewTexture( grid, subview ) {

		const [ tu0, tv0, tu1, tv1 ] = this._getSubviewUVBounds( grid, subview );
		const texture = grid.clone();
		texture.offset.set( tu0, tv0 );
		texture.repeat.set( tu1 - tu0, tv1 - tv0 );
		return texture;

	}

	// writes a raw elevation range onto a tile's bounding volume, applying the height scale, so the
	// traversal reads the new bounds. The low bound is dropped by the skirt depth. "inherited" ranges
	// are ancestor estimates that never overwrite a tile's own measured range.
	_updateBoundingVolume( tile, minHeight, maxHeight, inherited = false ) {

		const range = tile[ ELEVATION_RANGE ];
		if ( inherited && range && ! range.inherited ) {

			return;

		}

		tile[ ELEVATION_RANGE ] = { min: minHeight, max: maxHeight, inherited };

		const scale = this._heightScale;
		const min = Math.min( minHeight * scale, maxHeight * scale ) - tile.geometricError;
		const max = Math.max( minHeight * scale, maxHeight * scale );

		// the engine volume only exists once the tile has been preprocessed
		const { boundingVolume, engineData } = tile;
		const region = boundingVolume.region;
		region[ 4 ] = min;
		region[ 5 ] = max;
		if ( engineData && engineData.boundingVolume ) {

			engineData.boundingVolume.setRegionData( this.tiles.ellipsoid, ...region );

		}

	}

	// update the displacement scale on all loaded materials and refresh every bounding volume from
	// its stored raw elevation range. TODO: this could be done as-needed or as-traversed instead.
	_updateHeightScale() {

		const { tiles } = this;
		if ( ! tiles ) {

			return;

		}

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isMesh ) {

					c.material.displacementScale = this._heightScale;

				}

			} );

		} );

		tiles.traverse( tile => {

			const range = tile[ ELEVATION_RANGE ];
			if ( range ) {

				this._updateBoundingVolume( tile, range.min, range.max, range.inherited );

			}

		}, null, false );

	}

	_createEllipsoidMesh( tile ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ , south, , north ] = tile.boundingVolume.region;
		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		const grid = tile[ HEIGHT_GRID ];
		const [ tu0, tv0, tu1, tv1 ] = this._getSubviewUVBounds( grid, tile[ SUBVIEW ] );

		// new geometry positioned at the tile bounding sphere center
		const geometry = new SkirtedPlaneGeometry( 1, 1, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, new MeshLambertMaterial() );
		tile.engineData.boundingVolume.getSphere( _sphere );
		mesh.position.copy( _sphere.center );

		// position the surface vertices on the displaced ellipsoid surface
		const { position, normal, uv } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		const cols = MESH_SIZE + 1;
		for ( let i = 0; i < surfaceVertexCount; i ++ ) {

			const col = i % cols;
			const row = Math.floor( i / cols );
			const uNorm = col / MESH_SIZE;
			const vNorm = 1 - row / MESH_SIZE;

			// convert the plane position to lat / lon
			const lon = projection.convertNormalizedToLongitude( MathUtils.mapLinear( uNorm, 0, 1, minU, maxU ) );
			let lat = projection.convertNormalizedToLatitude( MathUtils.mapLinear( vNorm, 0, 1, minV, maxV ) );

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

				const latLimit = projection.convertNormalizedToLatitude( 1 );
				const vStep = 1 / MESH_SIZE;
				const prevLat = MathUtils.mapLinear( vNorm - vStep, 0, 1, south, north );
				const nextLat = MathUtils.mapLinear( vNorm + vStep, 0, 1, south, north );

				if ( lat > latLimit && prevLat < latLimit ) {

					lat = latLimit;

				}

				if ( lat < - latLimit && nextLat > - latLimit ) {

					lat = - latLimit;

				}

			}

			// derive UV from the final (potentially adjusted) lat/lon so the textures sample correctly
			const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, 0, 1 );
			const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, 0, 1 );

			// get the position and normal
			const height = sampleGrid( grid, MathUtils.mapLinear( u, 0, 1, tu0, tu1 ), MathUtils.mapLinear( v, 0, 1, tv0, tv1 ) ) * this._heightScale;
			tiles.ellipsoid.getCartographicToPosition( lat, lon, height, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			// update the geometry
			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, u, v );

		}

		// drop the skirt vertices from their source vertices along the surface normal
		for ( let i = 0, l = skirtSourceIndices.length; i < l; i ++ ) {

			const src = skirtSourceIndices[ i ];
			const dst = surfaceVertexCount + i;
			_pos.fromBufferAttribute( position, src );
			_norm.fromBufferAttribute( normal, src );
			_pos.addScaledVector( _norm, - tile.geometricError );

			position.setXYZ( dst, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( dst, _norm.x, _norm.y, _norm.z );
			uv.setXY( dst, uv.getX( src ), uv.getY( src ) );

		}

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

	// the content of every tile is the url of the texture it reads a subview of, so the levels
	// between fetch levels inherit the ancestor texture url
	getUrl( x, y, level ) {

		const sourceLevel = this._getSourceLevel( level );
		const scale = 2 ** ( level - sourceLevel );
		return this._source.getUrl( Math.floor( x / scale ), Math.floor( y / scale ), sourceLevel );

	}

	// all tile content is generated, and the textures are fetched through the shared grid cache
	fetchData( /* url */ ) {

		return new ArrayBuffer();

	}

	createBoundingVolume( x, y, level, regionHeight = 0 ) {

		const { _tiling: tiling, endCaps } = this;

		const isRoot = level === - 1;
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

	}

	createChild( x, y, level ) {

		const { _tiling: tiling } = this;
		const { projection } = tiling;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true );

		// one mesh cell width in uv space
		const tileUWidth = ( maxU - minU ) / MESH_SIZE;
		const tileVWidth = ( maxV - minV ) / MESH_SIZE;

		// calculate the region ranges
		const [ /* west */, south, east, north ] = tiling.getTileBounds( x, y, level );

		// calculate the changes in lat / lon at the given point
		// find the most bowed point of the latitude range since the amount that latitude changes is
		// dependent on the Y value of the image
		const midLat = ( south > 0 ) !== ( north > 0 ) ? 0 : Math.min( Math.abs( south ), Math.abs( north ) );
		const midV = projection.convertLatitudeToNormalized( midLat );
		const lonFactor = projection.getLongitudeDerivativeAtNormalized( minU );
		const latFactor = projection.getLatitudeDerivativeAtNormalized( midV );

		// calculate the size of a mesh cell on the surface
		const [ xDeriv, yDeriv ] = getCartographicToMeterDerivative( this.tiles.ellipsoid, midLat, east );
		const geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level, geometricError ),
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

		// a child starts out assuming the same elevation range as its immediate parent; it gets
		// tightened once the child's own elevation data is available
		const range = tile[ ELEVATION_RANGE ];

		const { tileSplitX, tileSplitY } = this._tiling.getLevel( level );
		for ( let cx = 0; cx < tileSplitX; cx ++ ) {

			for ( let cy = 0; cy < tileSplitY; cy ++ ) {

				const child = this.createChild( tileSplitX * x + cx, tileSplitY * y + cy, level + 1 );
				if ( child ) {

					if ( range ) {

						this._updateBoundingVolume( child, range.min, range.max, true );

					}

					tile.children.push( child );

				}

			}

		}

	}

	// packed RGB to meters; override for other encodings
	decodeElevation( r, g, b ) {

		return - 10000 + ( r * 65536 + g * 256 + b ) * 0.1;

	}

}
