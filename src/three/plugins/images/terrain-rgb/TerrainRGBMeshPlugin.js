/** @import { ImageOverlay } from '../ImageOverlayPlugin.js' */
import {
	Mesh,
	MeshBasicMaterial,
	MathUtils,
	Vector3,
	Sphere,
} from 'three';
import { XYZImageSource } from '../sources/XYZImageSource.js';
import { getCartographicToMeterDerivative } from '../utils/getCartographicToMeterDerivative.js';
import { SkirtedPlaneGeometry } from './SkirtedPlaneGeometry.js';
import { GridCache } from './GridCache.js';
import { TerrainLambertMaterial } from './TerrainLambertMaterial.js';
import { TerrainBasicMaterial } from './TerrainBasicMaterial.js';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
const HEIGHT_GRID = Symbol( 'HEIGHT_GRID' );
const SOURCE_TILE = Symbol( 'SOURCE_TILE' );
const OVERLAY_RANGE = Symbol( 'OVERLAY_RANGE' );
const OVERLAY_LEVEL = Symbol( 'OVERLAY_LEVEL' );

// the raw measured elevation range of a tile, excluding height scale and padding
const HEIGHT_RANGE = Symbol( 'HEIGHT_RANGE' );

// mesh segments per tile
const MESH_SIZE = 32;

// fixed elevation range used to initialize every bounding region, encapsulating earth terrain
const MIN_ELEVATION = - 500;
const MAX_ELEVATION = 9000;

// number of tile tree levels sharing each fetched texture level
const EXTRA_LEVELS = 2;

const _pos = /* @__PURE__ */ new Vector3();
const _norm = /* @__PURE__ */ new Vector3();
const _sphere = /* @__PURE__ */ new Sphere();
const _hits = [];

// shared scratch mesh for raycasting displaced vertices since all tiles use the same vertex layout
let _raycastMesh = null;
function getRaycastMesh() {

	if ( _raycastMesh === null ) {

		_raycastMesh = new Mesh( new SkirtedPlaneGeometry( 1, 1, MESH_SIZE, MESH_SIZE ), new MeshBasicMaterial() );
		_raycastMesh.matrixAutoUpdate = false;

	}

	return _raycastMesh;

}

// the source tile level holding the texture a tile at the given level reads a subview of
function getSourceLevel( level ) {

	return EXTRA_LEVELS * Math.floor( level / EXTRA_LEVELS );

}

// texture coordinate range of a subview within the padded grid texture. The half texel inset
// means tile edges sample into the stitched border so both sides of a seam agree.
function getSubviewUVBounds( grid, subview ) {

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
 * > [!NOTE]
 * > Enabling frustum culling on the tile meshes is not supported since the geometry bounds do not
 * > include the gpu displacement. Culling is handled by the tile traversal.
 *
 * > [!NOTE]
 * > Debug bounding volume visualizations, such as those from DebugTilesPlugin, may not display
 * > correctly after changing the height scale since they are not rebuilt when the tile bounding
 * > volumes update.
 *
 * @param {Object} [options]
 * @param {string} options.url XYZ url template, e.g. `.../{z}/{x}/{y}.png`.
 * @param {number} [options.tileDimension=256] Source tile pixel size.
 * @param {number} [options.maxZoom=15] Highest zoom level the source provides.
 * @param {number} [options.heightScale=1] Vertical exaggeration. Can be adjusted dynamically.
 * @param {ImageOverlay} [options.overlay=null] Overlay used to texture the tiles when
 *   `applyOverlayTexture` is enabled.
 * @param {boolean} [options.applyOverlayTexture=false] Whether to apply the overlay texture.
 * @param {boolean} [options.unlit=false] Render the tiles without lighting or terrain normals.
 * @param {('ellipsoid'|'planar')} [options.shape='ellipsoid'] Surface shape.
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
			tileDimension = 256,
			maxZoom = 15,
			heightScale = 1,
			overlay = null,
			applyOverlayTexture = false,
			unlit = false,
			shape = 'ellipsoid',
			endCaps = true,
			useRecommendedSettings = true,
		} = options;

		this.name = 'TERRAIN_RGB_MESH_PLUGIN';
		this.priority = - 10;
		this.tiles = null;

		this.url = url;
		this.tileDimension = tileDimension;
		this.maxZoom = maxZoom;
		this.overlay = overlay;
		this.applyOverlayTexture = applyOverlayTexture;
		this.unlit = unlit;
		this.shape = shape;
		this.endCaps = endCaps;
		this.useRecommendedSettings = useRecommendedSettings;
		this.heightScale = heightScale;

		this._source = null;
		this._gridCache = new GridCache( this );
		this._tiling = null;

	}

	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;

		}

		// options are fixed once the plugin is initialized. The tree extends past the last fetched
		// texture level so its subview layers exist.
		const { url, tileDimension, maxZoom } = this;
		const maxLevel = EXTRA_LEVELS * Math.floor( maxZoom / EXTRA_LEVELS ) + EXTRA_LEVELS - 1;
		this._source = new XYZImageSource( { url, tileDimension, levels: maxLevel + 1 } );

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
		const sourceLevel = getSourceLevel( level );
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

		// Build the surface mesh displaced by the elevation texture, which also drives the bump map
		// normals. Clones share the texture upload while each tile disposes its own reference.
		const subview = this._getSubview( tile );
		const mesh = this._useEllipsoid() ? this._createEllipsoidMesh( tile, subview ) : this._createPlanarMesh( tile, subview );
		const displacement = grid.clone();
		mesh.material.displacementMap = displacement;
		if ( ! this.unlit ) {

			mesh.material.bumpMap = displacement;

		}

		// seed the children with this tile's measured height range so they hold a tighter estimate
		// than the conservative default until their own data loads
		tile.children.forEach( child => {

			if ( ! child[ HEIGHT_RANGE ] ) {

				child[ HEIGHT_RANGE ] = tile[ HEIGHT_RANGE ];
				this._updateBoundingVolume( child );

			}

		} );

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

				// The mesh uvs live in the elevation texture's subview range, so remap the overlay
				// from that range onto its own uv bounds via a clone's transform.
				const [ tu0, tv0, tu1, tv1 ] = getSubviewUVBounds( grid, subview );
				const uvRange = this._tiling.getTileContentUVBounds( x, y, level );
				const repeatX = ( uvRange[ 2 ] - uvRange[ 0 ] ) / ( tu1 - tu0 );
				const repeatY = ( uvRange[ 3 ] - uvRange[ 1 ] ) / ( tv1 - tv0 );
				const texture = overlay.getTexture( range, level ).clone();
				texture.offset.set( uvRange[ 0 ] - tu0 * repeatX, uvRange[ 1 ] - tv0 * repeatY );
				texture.repeat.set( repeatX, repeatY );

				mesh.material.map = texture;
				mesh.material.needsUpdate = true;

			}

		}

		// assigned after the last await so a height scale change mid-parse cannot leave a stale
		// scale on a material that "_updateHeightScale" has not seen yet
		mesh.material.displacementScale = this._heightScale;
		mesh.material.bumpScale = this._heightScale;

		return mesh;

	}

	// Raycast against a cpu-displaced copy of the tile geometry since the rendered vertices are
	// displaced on the gpu.
	// TODO: cache the displaced positions per tile rather than regenerating them per raycast
	raycastTile( tile, scene, raycaster, intersects ) {

		const grid = tile[ HEIGHT_GRID ];
		if ( ! grid ) {

			return false;

		}

		scene.traverse( c => {

			if ( c.isMesh ) {

				const raycastMesh = getRaycastMesh();
				const basePosition = c.geometry.attributes.position;
				const baseNormal = c.geometry.attributes.normal;
				const baseUv = c.geometry.attributes.uv;
				const position = raycastMesh.geometry.attributes.position;

				// displace the vertices along the normals to match the gpu result
				for ( let i = 0, l = position.count; i < l; i ++ ) {

					const height = sampleGrid( grid, baseUv.getX( i ), baseUv.getY( i ) ) * this._heightScale;

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

		}

	}

	dispose() {

		// Every tile locks its grid once and releases it once, so the cache empties itself. Grids
		// locked by in-flight parses are released by their abort handling once they settle.
		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

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

	_createEllipsoidMesh( tile, subview ) {

		const { tiles, endCaps, _tiling: tiling } = this;
		const { projection } = tiling;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		const [ , south, , north ] = tile.boundingVolume.region;
		const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true, true );

		const grid = tile[ HEIGHT_GRID ];
		const [ tu0, tv0, tu1, tv1 ] = getSubviewUVBounds( grid, subview );

		// new geometry positioned at the tile bounding sphere center
		const geometry = new SkirtedPlaneGeometry( 1, 1, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, this.unlit ? new TerrainBasicMaterial() : new TerrainLambertMaterial() );
		tile.engineData.boundingVolume.getSphere( _sphere );
		mesh.position.copy( _sphere.center );

		// position the surface vertices on the ellipsoid, tracking the raw elevation range
		const { position, normal, uv } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		const cols = MESH_SIZE + 1;
		let minHeight = Infinity;
		let maxHeight = - Infinity;
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

			// derive uvs from the final adjusted lat / lon, mapped into the elevation texture's
			// subview so they sample the correct portion of the texture directly
			const u = MathUtils.mapLinear( projection.convertLongitudeToNormalized( lon ), minU, maxU, 0, 1 );
			const v = MathUtils.mapLinear( projection.convertLatitudeToNormalized( lat ), minV, maxV, 0, 1 );
			const tu = MathUtils.mapLinear( u, 0, 1, tu0, tu1 );
			const tv = MathUtils.mapLinear( v, 0, 1, tv0, tv1 );

			// get the position and normal
			const height = sampleGrid( grid, tu, tv );
			if ( height < minHeight ) minHeight = height;
			if ( height > maxHeight ) maxHeight = height;
			tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, _pos ).sub( _sphere.center );
			tiles.ellipsoid.getCartographicToNormal( lat, lon, _norm );

			// update the geometry
			position.setXYZ( i, _pos.x, _pos.y, _pos.z );
			normal.setXYZ( i, _norm.x, _norm.y, _norm.z );
			uv.setXY( i, tu, tv );

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

		tile[ HEIGHT_RANGE ] = { min: minHeight, max: maxHeight };
		this._updateBoundingVolume( tile );
		return mesh;

	}

	_createPlanarMesh( tile, subview ) {

		const boundingBox = tile.boundingVolume.box;
		const x = boundingBox[ 0 ];
		const y = boundingBox[ 1 ];
		const sx = boundingBox[ 3 ];
		const sy = boundingBox[ 7 ];

		const grid = tile[ HEIGHT_GRID ];
		const [ tu0, tv0, tu1, tv1 ] = getSubviewUVBounds( grid, subview );

		const geometry = new SkirtedPlaneGeometry( 2 * sx, 2 * sy, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, this.unlit ? new TerrainBasicMaterial() : new TerrainLambertMaterial() );
		mesh.position.set( x, y, 0 );

		// map the uvs into the texture subview, tracking the raw elevation range
		const { position, uv } = geometry.attributes;
		const { surfaceVertexCount, skirtSourceIndices } = geometry;
		let minHeight = Infinity;
		let maxHeight = - Infinity;
		for ( let i = 0; i < surfaceVertexCount; i ++ ) {

			const tu = MathUtils.mapLinear( uv.getX( i ), 0, 1, tu0, tu1 );
			const tv = MathUtils.mapLinear( uv.getY( i ), 0, 1, tv0, tv1 );
			const height = sampleGrid( grid, tu, tv );
			if ( height < minHeight ) minHeight = height;
			if ( height > maxHeight ) maxHeight = height;
			uv.setXY( i, tu, tv );

		}

		// drop the skirt vertices below their source vertices
		for ( let i = 0, l = skirtSourceIndices.length; i < l; i ++ ) {

			const src = skirtSourceIndices[ i ];
			position.setZ( surfaceVertexCount + i, - tile.geometricError );
			uv.setXY( surfaceVertexCount + i, uv.getX( src ), uv.getY( src ) );

		}

		tile[ HEIGHT_RANGE ] = { min: minHeight, max: maxHeight };
		this._updateBoundingVolume( tile );
		return mesh;

	}

	// Writes the tile's elevation range onto its bounding volume: the measured range once its
	// elevation data has loaded, or the fixed conservative range before then. The range is padded
	// by the geometric error since it covers the expected deviation from the true surface,
	// enclosing detail that finer levels can add as well as the skirts.
	_updateBoundingVolume( tile ) {

		const scale = this._heightScale;
		const pad = tile[ TILE_LEVEL ] === - 1 ? 0 : tile.geometricError;
		const range = tile[ HEIGHT_RANGE ];

		let min, max;
		if ( range ) {

			min = range.min * scale - pad;
			max = range.max * scale + pad;

		} else {

			min = MIN_ELEVATION * scale - pad;
			max = MAX_ELEVATION * scale;

		}

		// the engine volume only exists once the tile has been preprocessed
		const { boundingVolume, engineData } = tile;
		if ( boundingVolume.region ) {

			const region = boundingVolume.region;
			region[ 4 ] = min;
			region[ 5 ] = max;
			if ( engineData && engineData.boundingVolume ) {

				engineData.boundingVolume.setRegionData( this.tiles.ellipsoid, ...region );

			}

		} else {

			// elevation runs along local z: set the box center and half extent
			const box = boundingVolume.box;
			box[ 2 ] = ( min + max ) / 2;
			box[ 11 ] = ( max - min ) / 2;
			if ( engineData && engineData.boundingVolume ) {

				engineData.boundingVolume.setObbData( box, engineData.transform );

			}

		}

	}

	// update the displacement scale on the loaded materials and refresh every bounding volume for
	// the new height range
	_updateHeightScale() {

		const { tiles } = this;
		if ( ! tiles ) {

			return;

		}

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isMesh ) {

					c.material.displacementScale = this._heightScale;
					c.material.bumpScale = this._heightScale;

				}

			} );

		} );

		tiles.traverse( tile => {

			this._updateBoundingVolume( tile );

		}, null, false );

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

		const sourceLevel = getSourceLevel( level );
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

		// a fixed elevation range covering all terrain, dropping the low bound by the skirt depth
		const minHeight = MIN_ELEVATION * this.heightScale - regionHeight;
		const maxHeight = MAX_ELEVATION * this.heightScale;

		if ( this._useEllipsoid() ) {

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

			return { region: [ ...cartBounds, minHeight, maxHeight ] };

		} else {

			let normalizedBounds;
			if ( isRoot ) {

				normalizedBounds = tiling.getContentBounds( true );

			} else {

				normalizedBounds = tiling.getTileBounds( x, y, level, true );

			}

			// world space bounds from the normalized range, centered on the origin, with the
			// elevation range along z
			const [ minX, minY, maxX, maxY ] = normalizedBounds;
			const extentsX = tiling.aspectRatio * ( maxX - minX ) / 2;
			const extentsY = ( maxY - minY ) / 2;
			const centerX = tiling.aspectRatio * ( ( minX + maxX ) / 2 - 0.5 );
			const centerY = ( minY + maxY ) / 2 - 0.5;

			return {
				box: [
					centerX, centerY, ( minHeight + maxHeight ) / 2,
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
					0.0, 0.0, ( maxHeight - minHeight ) / 2,
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
		if ( this._useEllipsoid() ) {

			const [ minU, minV, maxU, maxV ] = tiling.getTileBounds( x, y, level, true );
			const { tilePixelWidth, tilePixelHeight } = tiling.getLevel( level );

			// one pixel width in uv space, so the error ladder halves per level and the inserted
			// layers interpolate between the fetched texture levels
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

			// Size of one pixel in world space. The tile contents span [ 0, 1 ] along y and
			// [ 0, aspectRatio ] along x.
			const { pixelWidth, pixelHeight } = tiling.getLevel( level );
			geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

		}

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

	// packed RGB to meters; override for other encodings
	decodeElevation( r, g, b ) {

		return - 10000 + ( r * 65536 + g * 256 + b ) * 0.1;

	}

}
