/** @import { WebGLRenderer } from 'three' */
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	FloatType,
	MathUtils,
	Matrix4,
	Mesh,
	NearestFilter,
	NoBlending,
	OrthographicCamera,
	RGBAFormat,
	Scene,
	ShaderMaterial,
	Vector2,
	Vector4,
	WebGLRenderTarget,
} from 'three';
import { getMeshesCartographicRange } from './images/overlays/utils.js';

// per-tile elevation raster { region, grid, disposed }
const ELEVATION_INFO = Symbol( 'ELEVATION_INFO' );

// Value stored in the grid where no geometry was drawn, detected via the raster alpha channel.
// Written on the cpu so it round trips through the float grid exactly.
const NO_DATA = - Infinity;

const _matrix = /* @__PURE__ */ new Matrix4();
const _color = /* @__PURE__ */ new Color();
const _prevColor = /* @__PURE__ */ new Color();

// camera required by the renderer, unused since the shader outputs clip positions directly
const _camera = /* @__PURE__ */ new OrthographicCamera();

// rasterizes vertices holding [ lon, lat, height ] over the tile's cartographic range, with the
// height written as depth so the depth test resolves the top surface per texel
let _material = null;
function getRasterMaterial() {

	if ( _material === null ) {

		_material = new ShaderMaterial( {
			side: DoubleSide,
			blending: NoBlending,
			uniforms: {
				range: { value: new Vector4() },
				heightRange: { value: new Vector2() },
			},
			vertexShader: /* glsl */`
				uniform vec4 range;
				uniform vec2 heightRange;
				varying float vHeight;
				void main() {

					vHeight = position.z;

					// map the cartographic position across the target and the height to depth such
					// that the highest surface wins the depth test
					float x = 2.0 * ( position.x - range.x ) / ( range.z - range.x ) - 1.0;
					float y = 2.0 * ( position.y - range.y ) / ( range.w - range.y ) - 1.0;
					float z = 1.0 - 2.0 * ( position.z - heightRange.x ) / ( heightRange.y - heightRange.x );
					gl_Position = vec4( x, y, z, 1.0 );

				}
			`,
			fragmentShader: /* glsl */`
				varying float vHeight;
				void main() {

					gl_FragColor = vec4( vHeight, 0.0, 0.0, 1.0 );

				}
			`,
		} );

	}

	return _material;

}

// Packs a pair of possibly negative cell indices into a single numeric key. The offsets and span
// cover the finest practical cell resolutions without index collisions.
const CELL_KEY_OFFSET = 2 ** 24;
const CELL_KEY_SPAN = 2 ** 25;
function getCellKey( xi, yi ) {

	return ( xi + CELL_KEY_OFFSET ) * CELL_KEY_SPAN + yi + CELL_KEY_OFFSET;

}

// whether the longitude falls in the range, accounting for ranges unwrapped past the antimeridian
function adjustLonToRange( lon, minLon, maxLon ) {

	if ( lon < minLon && lon + 2 * Math.PI <= maxLon ) {

		return lon + 2 * Math.PI;

	}

	if ( lon > maxLon && lon - 2 * Math.PI >= minLon ) {

		return lon - 2 * Math.PI;

	}

	return lon;

}

// Blend a pair of texels, taking the single valid one when the other has no data. Non-finite
// values are treated as no data since rasterized degenerate geometry can produce NaN texels.
function blendPair( a, b, t ) {

	const aValid = Number.isFinite( a );
	const bValid = Number.isFinite( b );
	if ( aValid && bValid ) {

		return MathUtils.lerp( a, b, t );

	}

	if ( aValid ) {

		return a;

	}

	if ( bValid ) {

		return b;

	}

	return NO_DATA;

}

// bilinear sample of the tile raster, blending the valid texels per axis so points at the edge of
// the mesh coverage still resolve. Returns null when no texel covering the point has data.
function sampleInfo( info, lat, lon ) {

	const { region, grid, resolution } = info;
	const [ minLon, minLat, maxLon, maxLat ] = region;

	lon = adjustLonToRange( lon, minLon, maxLon );
	if ( lon < minLon || lon > maxLon || lat < minLat || lat > maxLat ) {

		return null;

	}

	const u = ( lon - minLon ) / ( maxLon - minLon );
	const v = ( lat - minLat ) / ( maxLat - minLat );
	const fx = MathUtils.clamp( u * resolution - 0.5, 0, resolution - 1 );
	const fy = MathUtils.clamp( v * resolution - 0.5, 0, resolution - 1 );
	const x0 = Math.floor( fx );
	const y0 = Math.floor( fy );
	const x1 = Math.min( x0 + 1, resolution - 1 );
	const y1 = Math.min( y0 + 1, resolution - 1 );

	const h00 = grid[ y0 * resolution + x0 ];
	const h10 = grid[ y0 * resolution + x1 ];
	const h01 = grid[ y1 * resolution + x0 ];
	const h11 = grid[ y1 * resolution + x1 ];
	const tx = fx - x0;
	const ty = fy - y0;

	const h0 = blendPair( h00, h10, tx );
	const h1 = blendPair( h01, h11, tx );
	const h = blendPair( h0, h1, ty );
	if ( ! Number.isFinite( h ) ) {

		return null;

	}

	return h;

}

/**
 * Rasterizes the elevation of every loaded tile into a small float grid so elevations can be
 * queried against the tile set quickly without raycasting, exposed via
 * `sampleCartographicElevation`. Each grid is generated once when the tile geometry loads since
 * tile content never changes.
 *
 * @param {Object} options
 * @param {WebGLRenderer} options.renderer The renderer used to rasterize the tile geometry.
 * @param {number} [options.resolution=128] Raster resolution per tile.
 */
export class RasterElevationSamplingPlugin {

	constructor( options = {} ) {

		const {
			renderer = null,
			resolution = 128,
		} = options;

		this.name = 'RASTER_ELEVATION_SAMPLING_PLUGIN';
		this.tiles = null;
		this.renderer = renderer;
		this.resolution = resolution;

		this._depthLevels = [];

	}

	init( tiles ) {

		this.tiles = tiles;

		// Bucket the sampleable active tiles into a grid of cells per depth, with the cell size
		// matched to the largest tile patch at that depth so each tile spans at most four cells.
		// The cell buckets are sorted by max elevation so the highest surfaces are found first, and
		// the depths are ordered deepest first so the samples test the tiles that take precedence
		// first and can stop at the first depth with data.
		this._onUpdateAfter = () => {

			const byDepth = new Map();
			tiles.activeTiles.forEach( tile => {

				const info = tile[ ELEVATION_INFO ];
				if ( ! info || info.grid === null ) {

					return;

				}

				const depth = tile.internal.depth;
				let tilesAtDepth = byDepth.get( depth );
				if ( ! tilesAtDepth ) {

					tilesAtDepth = [];
					byDepth.set( depth, tilesAtDepth );

				}

				tilesAtDepth.push( tile );

			} );

			const levels = this._depthLevels;
			levels.length = 0;
			byDepth.forEach( ( tilesAtDepth, depth ) => {

				// find the largest patch dimensions at this depth
				let cellWidth = 0;
				let cellHeight = 0;
				tilesAtDepth.forEach( tile => {

					const region = tile[ ELEVATION_INFO ].region;
					cellWidth = Math.max( cellWidth, region[ 2 ] - region[ 0 ] );
					cellHeight = Math.max( cellHeight, region[ 3 ] - region[ 1 ] );

				} );

				// insert the tiles into every cell they overlap in max elevation order
				tilesAtDepth.sort( ( a, b ) => b[ ELEVATION_INFO ].region[ 5 ] - a[ ELEVATION_INFO ].region[ 5 ] );

				const cells = new Map();
				tilesAtDepth.forEach( tile => {

					const region = tile[ ELEVATION_INFO ].region;
					const minXi = Math.floor( region[ 0 ] / cellWidth );
					const maxXi = Math.floor( region[ 2 ] / cellWidth );
					const minYi = Math.floor( region[ 1 ] / cellHeight );
					const maxYi = Math.floor( region[ 3 ] / cellHeight );
					for ( let xi = minXi; xi <= maxXi; xi ++ ) {

						for ( let yi = minYi; yi <= maxYi; yi ++ ) {

							const key = getCellKey( xi, yi );
							let bucket = cells.get( key );
							if ( ! bucket ) {

								bucket = [];
								cells.set( key, bucket );

							}

							bucket.push( tile );

						}

					}

				} );

				levels.push( { depth, cellWidth, cellHeight, cells } );

			} );

			levels.sort( ( a, b ) => b.depth - a.depth );

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	/**
	 * Samples the rasterized elevation of the active tiles at the given cartographic point,
	 * resolving overlapping tiles to the highest surface.
	 * @param {number} lat Latitude in radians.
	 * @param {number} lon Longitude in radians.
	 * @returns {number|null} The elevation, or `null` when no data covering the point is loaded.
	 */
	sampleCartographicElevation( lat, lon ) {

		if ( this.tiles === null ) {

			return null;

		}

		// Check the cell containing the point at every depth from deepest to shallowest, probing
		// the wrapped longitudes so patches unwrapped past the antimeridian are found. Deeper tile
		// data takes precedence over the coarser tiles containing it so simplified geometry cannot
		// override it, and the overlapping tiles at the same depth resolve to the highest surface.
		const levels = this._depthLevels;
		let best = null;
		let bestDepth = - 1;
		for ( let i = 0, l = levels.length; i < l; i ++ ) {

			const level = levels[ i ];
			if ( level.depth < bestDepth ) {

				break;

			}

			const { cellWidth, cellHeight, cells } = level;
			const yi = Math.floor( lat / cellHeight );
			for ( let wrap = - 1; wrap <= 1; wrap ++ ) {

				const xi = Math.floor( ( lon + wrap * 2 * Math.PI ) / cellWidth );
				const bucket = cells.get( getCellKey( xi, yi ) );
				if ( ! bucket ) {

					continue;

				}

				for ( let j = 0, jl = bucket.length; j < jl; j ++ ) {

					// the tile may have been disposed since the cells were built
					const info = bucket[ j ][ ELEVATION_INFO ];
					if ( ! info ) {

						continue;

					}

					// the bucket is sorted by max elevation so none of the remaining tiles can
					// rise above the best sample
					if ( best !== null && info.region[ 5 ] <= best ) {

						break;

					}

					const sample = sampleInfo( info, lat, lon );
					if ( sample !== null && ( best === null || sample > best ) ) {

						best = sample;
						bestDepth = level.depth;

					}

				}

			}

		}

		return best;

	}

	async processTileModel( scene, tile ) {

		const { tiles, renderer, resolution } = this;

		// collect the tile meshes
		const meshes = [];
		scene.updateMatrixWorld();
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		if ( meshes.length === 0 ) {

			return;

		}

		// find the cartographic range and per-vertex cartographic positions of the geometry
		_matrix.identity();
		if ( scene.parent !== null ) {

			_matrix.copy( tiles.group.matrixWorldInverse );

		}

		const { uvs, region } = getMeshesCartographicRange( meshes, tiles.ellipsoid, _matrix );
		const [ minLon, minLat, maxLon, maxLat, minHeight, maxHeight ] = region;
		if ( ! ( maxLon > minLon ) || ! ( maxLat > minLat ) ) {

			return;

		}

		const info = {
			region,
			grid: null,
			resolution,
			disposed: false,
		};
		tile[ ELEVATION_INFO ] = info;

		// build the raster scene from the cartographic vertex positions, sharing the mesh indices
		const rasterScene = new Scene();
		const material = getRasterMaterial();
		material.uniforms.range.value.set( minLon, minLat, maxLon, maxLat );
		material.uniforms.heightRange.value.set( minHeight, maxHeight > minHeight ? maxHeight : minHeight + 1 );

		const geometries = [];
		meshes.forEach( ( mesh, i ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( uvs[ i ] ), 3 ) );
			if ( mesh.geometry.index ) {

				geometry.setIndex( new BufferAttribute( mesh.geometry.index.array, 1 ) );

			}

			const rasterMesh = new Mesh( geometry, material );
			rasterMesh.frustumCulled = false;
			rasterScene.add( rasterMesh );
			geometries.push( geometry );

		} );

		// rasterize the heights, saving and restoring the renderer state
		const target = new WebGLRenderTarget( resolution, resolution, {
			format: RGBAFormat,
			type: FloatType,
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			generateMipmaps: false,
			depthBuffer: true,
		} );

		// clear alpha to zero so covered texels can be told apart from empty ones
		const prevTarget = renderer.getRenderTarget();
		const prevAlpha = renderer.getClearAlpha();
		const prevAutoClear = renderer.autoClear;
		renderer.getClearColor( _prevColor );

		renderer.setRenderTarget( target );
		renderer.setClearColor( _color.setRGB( 0, 0, 0 ), 0 );
		renderer.autoClear = true;
		renderer.render( rasterScene, _camera );

		renderer.setRenderTarget( prevTarget );
		renderer.setClearColor( _prevColor, prevAlpha );
		renderer.autoClear = prevAutoClear;

		geometries.forEach( geometry => geometry.dispose() );

		// Read the raster back and extract the height channel before the tile is considered
		// processed, so every displayed tile can be sampled immediately.
		const buffer = new Float32Array( resolution * resolution * 4 );
		try {

			await renderer.readRenderTargetPixelsAsync( target, 0, 0, resolution, resolution, buffer );

		} catch {

			target.dispose();
			return;

		}

		target.dispose();

		if ( info.disposed ) {

			return;

		}

		const grid = new Float32Array( resolution * resolution );
		for ( let i = 0, l = grid.length; i < l; i ++ ) {

			grid[ i ] = buffer[ 4 * i + 3 ] > 0.5 ? buffer[ 4 * i ] : NO_DATA;

		}

		info.grid = grid;

	}

	disposeTile( tile ) {

		const info = tile[ ELEVATION_INFO ];
		if ( info ) {

			info.disposed = true;
			delete tile[ ELEVATION_INFO ];

		}

	}

	dispose() {

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this._depthLevels.length = 0;

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

	}

}
