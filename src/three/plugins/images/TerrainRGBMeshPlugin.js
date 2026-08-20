/** @import { ImageOverlay } from './ImageOverlayPlugin.js' */
import {
	Mesh,
	MeshLambertMaterial,
	MeshBasicMaterial,
	MathUtils,
	Vector3,
	Sphere,
	BufferGeometry,
	BufferAttribute,
	DataTexture,
	RedFormat,
	FloatType,
	LinearFilter,
} from 'three';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { DataCache } from './utils/DataCache.js';
import { TilingScheme } from './utils/TilingScheme.js';
import { getCartographicToMeterDerivative } from './utils/getCartographicToMeterDerivative.js';

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

// mesh segments per tile. Each elevation texture is split into enough tile layers that the deepest
// layer renders one mesh cell per texel.
const MESH_SIZE = 64;

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();
const _hits = [];

// Plane geometry with a skirt around the perimeter. The surface vertices and triangles are laid out
// first, matching PlaneGeometry, followed by the skirt vertices and triangles. Each skirt vertex
// duplicates the perimeter surface vertex at "skirtSourceIndices[ i - surfaceVertexCount ]".
class SkirtedPlaneGeometry extends BufferGeometry {

	constructor( width = 1, height = 1, widthSegments = 1, heightSegments = 1 ) {

		super();

		const cols = widthSegments + 1;
		const rows = heightSegments + 1;
		const surfaceVertexCount = cols * rows;

		// perimeter vertex loop, clockwise so the skirt triangles face outward
		const perimeter = [];
		for ( let x = 0; x < cols; x ++ ) {

			perimeter.push( x );

		}

		for ( let y = 1; y < rows; y ++ ) {

			perimeter.push( y * cols + cols - 1 );

		}

		for ( let x = cols - 2; x >= 0; x -- ) {

			perimeter.push( ( rows - 1 ) * cols + x );

		}

		for ( let y = rows - 2; y >= 1; y -- ) {

			perimeter.push( y * cols );

		}

		const skirtVertexCount = perimeter.length;
		const vertexCount = surfaceVertexCount + skirtVertexCount;
		const position = new Float32Array( 3 * vertexCount );
		const normal = new Float32Array( 3 * vertexCount );
		const uv = new Float32Array( 2 * vertexCount );

		// flat surface vertices
		for ( let row = 0; row < rows; row ++ ) {

			for ( let col = 0; col < cols; col ++ ) {

				const i = row * cols + col;
				const u = col / widthSegments;
				const v = 1 - row / heightSegments;
				position[ 3 * i + 0 ] = ( u - 0.5 ) * width;
				position[ 3 * i + 1 ] = ( v - 0.5 ) * height;
				normal[ 3 * i + 2 ] = 1;
				uv[ 2 * i + 0 ] = u;
				uv[ 2 * i + 1 ] = v;

			}

		}

		// skirt vertices copy their source vertex
		for ( let i = 0; i < skirtVertexCount; i ++ ) {

			const src = perimeter[ i ];
			const dst = surfaceVertexCount + i;
			position[ 3 * dst + 0 ] = position[ 3 * src + 0 ];
			position[ 3 * dst + 1 ] = position[ 3 * src + 1 ];
			position[ 3 * dst + 2 ] = position[ 3 * src + 2 ];
			normal[ 3 * dst + 2 ] = 1;
			uv[ 2 * dst + 0 ] = uv[ 2 * src + 0 ];
			uv[ 2 * dst + 1 ] = uv[ 2 * src + 1 ];

		}

		// surface triangles
		const index = new Uint32Array( 6 * widthSegments * heightSegments + 6 * skirtVertexCount );
		let offset = 0;
		for ( let y = 0; y < heightSegments; y ++ ) {

			for ( let x = 0; x < widthSegments; x ++ ) {

				const a = y * cols + x;
				const b = ( y + 1 ) * cols + x;
				const c = ( y + 1 ) * cols + x + 1;
				const d = y * cols + x + 1;
				index[ offset ++ ] = a;
				index[ offset ++ ] = b;
				index[ offset ++ ] = d;
				index[ offset ++ ] = b;
				index[ offset ++ ] = c;
				index[ offset ++ ] = d;

			}

		}

		// skirt triangles, one quad per perimeter edge
		for ( let e = 0; e < skirtVertexCount; e ++ ) {

			const ne = ( e + 1 ) % skirtVertexCount;
			const a = perimeter[ e ];
			const b = perimeter[ ne ];
			const sa = surfaceVertexCount + e;
			const sb = surfaceVertexCount + ne;
			index[ offset ++ ] = a;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sa;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sb;
			index[ offset ++ ] = sa;

		}

		this.setIndex( new BufferAttribute( index, 1 ) );
		this.setAttribute( 'position', new BufferAttribute( position, 3 ) );
		this.setAttribute( 'normal', new BufferAttribute( normal, 3 ) );
		this.setAttribute( 'uv', new BufferAttribute( uv, 2 ) );

		this.surfaceVertexCount = surfaceVertexCount;
		this.skirtSourceIndices = new Uint32Array( perimeter );

	}

}

// draws the image, decodes each pixel to meters, and returns a single-channel float DataTexture.
// The grid is padded with a one texel border, initialized by duplicating the edge texels, that is
// filled from neighboring tiles as they load so seams sample identical values on both sides.
function readImageData( image, canvas, decode ) {

	const { width, height } = image;
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
	ctx.drawImage( image, 0, 0 );

	const { data } = ctx.getImageData( 0, 0, width, height );
	ctx.clearRect( 0, 0, width, height );

	// decode into the interior of the padded grid, tracking the elevation range
	const pw = width + 2;
	const ph = height + 2;
	const elevations = new Float32Array( pw * ph );
	let minHeight = Infinity;
	let maxHeight = - Infinity;
	for ( let y = 0; y < height; y ++ ) {

		for ( let x = 0; x < width; x ++ ) {

			const i = 4 * ( y * width + x );
			const value = decode( data[ i ], data[ i + 1 ], data[ i + 2 ] );
			if ( value < minHeight ) minHeight = value;
			if ( value > maxHeight ) maxHeight = value;
			elevations[ ( y + 1 ) * pw + x + 1 ] = value;

		}

	}

	// duplicate the edge texels into the border
	for ( let x = 0; x < pw; x ++ ) {

		const xi = MathUtils.clamp( x, 1, pw - 2 );
		elevations[ x ] = elevations[ pw + xi ];
		elevations[ ( ph - 1 ) * pw + x ] = elevations[ ( ph - 2 ) * pw + xi ];

	}

	for ( let y = 1; y < ph - 1; y ++ ) {

		elevations[ y * pw ] = elevations[ y * pw + 1 ];
		elevations[ y * pw + pw - 1 ] = elevations[ y * pw + pw - 2 ];

	}

	const texture = new DataTexture( elevations, pw, ph, RedFormat, FloatType );
	texture.minFilter = LinearFilter;
	texture.magFilter = LinearFilter;
	texture.needsUpdate = true;
	texture.userData.minHeight = minHeight;
	texture.userData.maxHeight = maxHeight;
	return texture;

}

// copies the edge texels of the "src" grid into the border texels of the "dst" grid that face the
// neighbor at tile offset ( dx, dy ), where positive y steps north to match the grid row order
function fillBorder( dst, src, dx, dy ) {

	const { data, width, height } = dst.image;
	const srcData = src.image.data;
	const w = width - 2;
	const h = height - 2;

	const minX = dx === 1 ? width - 1 : dx === - 1 ? 0 : 1;
	const maxX = dx === - 1 ? 0 : dx === 1 ? width - 1 : width - 2;
	const minY = dy === 1 ? height - 1 : dy === - 1 ? 0 : 1;
	const maxY = dy === - 1 ? 0 : dy === 1 ? height - 1 : height - 2;

	for ( let y = minY; y <= maxY; y ++ ) {

		for ( let x = minX; x <= maxX; x ++ ) {

			data[ y * width + x ] = srcData[ ( y - dy * h ) * width + ( x - dx * w ) ];

		}

	}

	dst.needsUpdate = true;

}

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

// ref counted cache of decoded elevation grids shared by the tiles reading subviews of each texture
class GridCache extends DataCache {

	constructor( plugin ) {

		super();

		this.plugin = plugin;

	}

	async fetchItem( [ x, y, level ], signal ) {

		const { plugin } = this;
		const fetched = await plugin._source.fetchItem( [ x, y, level ], signal );
		const grid = readImageData( fetched.image, plugin._canvas, ( r, g, b ) => plugin.decodeElevation( r, g, b ) );
		plugin._source.disposeItem( fetched );

		this.stitchNeighbors( grid, x, y, level );
		return grid;

	}

	disposeItem( grid ) {

		if ( grid ) {

			grid.dispose();

		}

	}

	// exchanges edge texels with the loaded neighbor grids so both sides of a seam sample identical
	// values. The meshes need no updates since displacement reads the textures directly.
	stitchNeighbors( grid, x, y, level ) {

		const tiling = this.plugin._source.tiling;
		const { tileCountX } = tiling.getLevel( level );

		// grid rows run south to north, so the tile y step is flipped when the tiling is
		const yDir = tiling.flipY ? - 1 : 1;

		for ( let dx = - 1; dx <= 1; dx ++ ) {

			for ( let dy = - 1; dy <= 1; dy ++ ) {

				if ( dx === 0 && dy === 0 ) {

					continue;

				}

				// wrap the neighbor x so seams close across the antimeridian
				const nx = ( x + dx + tileCountX ) % tileCountX;
				const neighbor = this.get( nx, y + dy * yDir, level );
				if ( neighbor && ! ( neighbor instanceof Promise ) ) {

					fillBorder( grid, neighbor, dx, dy );
					fillBorder( neighbor, grid, - dx, - dy );

				}

			}

		}

	}

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
 * @param {('ellipsoid'|'planar')} [options.shape='ellipsoid'] Surface shape.
 * @param {boolean} [options.endCaps=true] For ellipsoid mode, snap poles to ±90° lat.
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
			shape = 'ellipsoid',
			endCaps = true,
			useRecommendedSettings = true,
		} = options;

		this.name = 'TERRAIN_RGB_MESH_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.overlay = overlay;
		this.applyOverlayTexture = applyOverlayTexture;
		this.shape = shape;
		this.endCaps = endCaps;
		this.useRecommendedSettings = useRecommendedSettings;
		this.maxZoom = maxZoom;

		this._heightScale = heightScale;
		this._source = new XYZImageSource( { url, tileDimension, levels: maxZoom + 1 } );
		this._gridCache = new GridCache( this );
		this._canvas = new OffscreenCanvas( 1, 1 );
		this._tiling = null;

		// number of tile layers each elevation texture is split into so the deepest layer renders
		// one mesh cell per texel
		this._extraLevels = Math.max( 0, Math.round( Math.log2( tileDimension / MESH_SIZE ) ) );

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

		// generate a render tiling that extends past the source levels so each elevation texture is
		// shared by multiple tile layers. Each render tile spans MESH_SIZE "pixels" so the derived
		// geometric error matches the size of one mesh cell.
		const sourceTiling = this._source.tiling;
		const tiling = new TilingScheme();
		tiling.flipY = sourceTiling.flipY;
		tiling.setProjection( sourceTiling.projection );
		tiling.setContentBounds( ...sourceTiling.projection.getBounds() );
		tiling.generateLevels( this.maxZoom + 1 + this._extraLevels, sourceTiling.projection.tileCountX, sourceTiling.projection.tileCountY, {
			tilePixelWidth: MESH_SIZE,
			tilePixelHeight: MESH_SIZE,
		} );

		this._tiling = tiling;
		return this.getTileset();

	}

	async parseToMesh( buffer, tile, extension, url, abortSignal ) {

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		// find the source tile that this render tile reads a subview of
		const sourceLevel = Math.max( 0, level - this._extraLevels );
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

		// tighten the bounding volume to the texture's cached elevation range
		this._updateBoundingVolume( tile, grid.userData.minHeight, grid.userData.maxHeight );

		// build the smooth surface mesh and displacement material
		const mesh = this._useEllipsoid() ? this._createEllipsoidMesh( tile ) : this._createPlanarMesh( tile );
		mesh.material.displacementMap = this._createSubviewTexture( grid, tile[ SUBVIEW ] );
		mesh.material.displacementScale = this._heightScale;

		// the flat geometry bounds do not include displacement, so rely on the tile traversal culling
		// TODO: manually inflate the geometry bounding volumes based on the elevation range instead
		mesh.frustumCulled = false;

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

		return mesh;

	}

	// raycast against a cpu-displaced copy of the tile geometry since the rendered vertices are
	// displaced on the gpu. TODO: cache the displaced positions per tile and mark them dirty when
	// the elevation data changes rather than regenerating them per raycast.
	raycastTile( tile, scene, raycaster, intersects ) {

		const grid = tile[ HEIGHT_GRID ];
		const subview = tile[ SUBVIEW ];
		if ( ! grid ) {

			return false;

		}

		scene.traverse( c => {

			if ( c.isMesh ) {

				const raycastMesh = this._getRaycastMesh();
				const basePosition = c.geometry.attributes.position;
				const baseNormal = c.geometry.attributes.normal;
				const baseUv = c.geometry.attributes.uv;
				const position = raycastMesh.geometry.attributes.position;

				// displace the vertices along the normals to match the gpu result
				const [ tu0, tv0, tu1, tv1 ] = this._getSubviewUVBounds( grid, subview );
				for ( let i = 0, l = position.count; i < l; i ++ ) {

					const tu = MathUtils.mapLinear( baseUv.getX( i ), 0, 1, tu0, tu1 );
					const tv = MathUtils.mapLinear( baseUv.getY( i ), 0, 1, tv0, tv1 );
					const height = sampleGrid( grid, tu, tv ) * this._heightScale;

					_pos.fromBufferAttribute( basePosition, i );
					_norm.fromBufferAttribute( baseNormal, i );
					_pos.addScaledVector( _norm, height );
					position.setXYZ( i, _pos.x, _pos.y, _pos.z );

				}

				raycastMesh.geometry.computeBoundingSphere();
				raycastMesh.matrixWorld.copy( c.matrixWorld );

				// remap the hits to the real mesh
				_hits.length = 0;
				raycastMesh.raycast( raycaster, _hits );
				_hits.forEach( hit => {

					hit.object = c;
					intersects.push( hit );

				} );

			}

		} );

		return true;

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

	// whether the plugin is loading as an ellipsoid or not
	_useEllipsoid() {

		return this._tiling.projection.isCartographic && this.shape === 'ellipsoid';

	}

	// normalized bounds of the render tile within its source tile
	_getSubview( tile ) {

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const [ sx, sy, sourceLevel ] = tile[ SOURCE_TILE ];

		const renderBounds = this._tiling.getTileBounds( x, y, level, true );
		const sourceBounds = this._source.tiling.getTileBounds( sx, sy, sourceLevel, true );
		const invW = 1 / ( sourceBounds[ 2 ] - sourceBounds[ 0 ] );
		const invH = 1 / ( sourceBounds[ 3 ] - sourceBounds[ 1 ] );

		return [
			( renderBounds[ 0 ] - sourceBounds[ 0 ] ) * invW,
			( renderBounds[ 1 ] - sourceBounds[ 1 ] ) * invH,
			( renderBounds[ 2 ] - sourceBounds[ 0 ] ) * invW,
			( renderBounds[ 3 ] - sourceBounds[ 1 ] ) * invH,
		];

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
		if ( boundingVolume.region ) {

			const region = boundingVolume.region;
			region[ 4 ] = min;
			region[ 5 ] = max;
			if ( engineData && engineData.boundingVolume ) {

				engineData.boundingVolume.setRegionData( this.tiles.ellipsoid, ...region );

			}

		} else if ( boundingVolume.box ) {

			// elevation runs along local Z: set the box center and half extent
			const box = boundingVolume.box;
			box[ 2 ] = ( min + max ) / 2;
			box[ 11 ] = ( max - min ) / 2;
			if ( engineData && engineData.boundingVolume ) {

				engineData.boundingVolume.setObbData( box, engineData.transform );

			}

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

	// shared scratch mesh used to raycast displaced tile geometry
	_getRaycastMesh() {

		if ( ! this._raycastMesh ) {

			const geometry = new SkirtedPlaneGeometry( 1, 1, MESH_SIZE, MESH_SIZE );
			this._raycastMesh = new Mesh( geometry, new MeshBasicMaterial() );
			this._raycastMesh.matrixAutoUpdate = false;

		}

		return this._raycastMesh;

	}

	_createEllipsoidMesh( tile ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ , south, , north ] = tile.boundingVolume.region;
		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		// new geometry positioned at the tile bounding sphere center
		const geometry = new SkirtedPlaneGeometry( 1, 1, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, new MeshLambertMaterial() );
		tile.engineData.boundingVolume.getSphere( _sphere );
		mesh.position.copy( _sphere.center );

		// position the surface vertices on the ellipsoid, leaving displacement to the material
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

			// get the position and normal
			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			// derive UV from the final (potentially adjusted) lat/lon so the textures sample correctly
			const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, 0, 1 );
			const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, 0, 1 );

			// update the geometry
			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, u, v );

		}

		// drop the skirt vertices from their source vertices along the surface normal so they stay
		// below the edge after displacement
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

	_createPlanarMesh( tile ) {

		const boundingBox = tile.boundingVolume.box;
		let sx = 1, sy = 1, x = 0, y = 0;
		if ( boundingBox ) {

			[ x, y ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		const geometry = new SkirtedPlaneGeometry( 2 * sx, 2 * sy, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, new MeshLambertMaterial() );
		mesh.position.set( x, y, 0 );

		// drop the skirt vertices so they stay below the edge after displacement
		const { position } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		for ( let i = 0, l = skirtSourceIndices.length; i < l; i ++ ) {

			position.setZ( surfaceVertexCount + i, - tile.geometricError );

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

			// calculate the world space bounds position from the range
			const [ minX, minY, maxX, maxY ] = normalizedBounds;
			let extentsX = ( maxX - minX ) / 2;
			let extentsY = ( maxY - minY ) / 2;
			let centerX = minX + extentsX - 0.5;
			let centerY = minY + extentsY - 0.5;

			// scale the fields
			centerX *= tiling.aspectRatio;
			extentsX *= tiling.aspectRatio;

			// return bounding box
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
			geometricError = Math.max( tileUWidth * lonFactor * xDeriv, tileVWidth * latFactor * yDeriv );

		} else {

			// Calculate geometric error: size of one pixel in world space.
			// The tile contents span [0, 1] along Y and [0, aspectRatio] along X.
			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

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

/**
 * {@link TerrainRGBMeshPlugin} for the Terrarium encoding.
 */
export class TerrariumMeshPlugin extends TerrainRGBMeshPlugin {

	constructor( options = {} ) {

		// AWS Terrarium tiles are 256px
		super( { tileDimension: 256, ...options } );

		this.name = 'TERRARIUM_MESH_PLUGIN';

	}

	decodeElevation( r, g, b ) {

		return ( r * 256 + g + b / 256 ) - 32768;

	}

}
