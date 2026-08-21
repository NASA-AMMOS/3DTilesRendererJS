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

// value stored in the grid where no geometry was drawn, detected via the raster alpha channel
const NO_DATA = - 1e30;
const NO_DATA_THRESHOLD = - 1e29;

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

// bilinear sample of the tile raster, returning null on any no-data texel so the caller falls
// back to another tile
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
	if ( h00 < NO_DATA_THRESHOLD || h10 < NO_DATA_THRESHOLD || h01 < NO_DATA_THRESHOLD || h11 < NO_DATA_THRESHOLD ) {

		return null;

	}

	const tx = fx - x0;
	const ty = fy - y0;
	const h0 = h00 * ( 1 - tx ) + h10 * tx;
	const h1 = h01 * ( 1 - tx ) + h11 * tx;
	return h0 * ( 1 - ty ) + h1 * ty;

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
export class RasterElevationPlugin {

	constructor( options = {} ) {

		const {
			renderer = null,
			resolution = 128,
		} = options;

		this.name = 'RASTER_ELEVATION_PLUGIN';
		this.tiles = null;
		this.renderer = renderer;
		this.resolution = resolution;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	/**
	 * Samples the rasterized elevation at the given cartographic point, preferring the deepest
	 * loaded tile data and falling back to ancestors where a tile has no coverage.
	 * @param {number} lat Latitude in radians.
	 * @param {number} lon Longitude in radians.
	 * @returns {number|null} The elevation, or `null` when no data covering the point is loaded.
	 */
	sampleCartographicElevation( lat, lon ) {

		const root = this.tiles && this.tiles.root;
		if ( ! root ) {

			return null;

		}

		return this._sampleTile( root, lat, lon );

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

	// Sample the deepest loaded tile data covering the point, pruning the traversal with the exact
	// mesh-derived patches and skipping subtrees that cannot exceed the best sample found so far.
	// Tiles without loaded geometry have no patch and are passed through.
	_sampleTile( tile, lat, lon ) {

		const info = tile[ ELEVATION_INFO ];
		if ( info ) {

			const [ minLon, minLat, maxLon, maxLat ] = info.region;
			const adjustedLon = adjustLonToRange( lon, minLon, maxLon );
			if ( lat < minLat || lat > maxLat || adjustedLon < minLon || adjustedLon > maxLon ) {

				return null;

			}

		}

		// deeper tile data takes precedence over the coarser tiles containing it, and overlapping
		// peers resolve to the highest surface
		let best = null;
		const children = tile.children || [];
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const child = children[ i ];
			const childInfo = child[ ELEVATION_INFO ];
			if ( best !== null && childInfo && childInfo.region[ 5 ] <= best ) {

				continue;

			}

			const sample = this._sampleTile( child, lat, lon );
			if ( sample !== null && ( best === null || sample > best ) ) {

				best = sample;

			}

		}

		if ( best !== null ) {

			return best;

		}

		if ( info && info.grid !== null ) {

			return sampleInfo( info, lat, lon );

		}

		return null;

	}

	dispose() {

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.disposeTile( tile );

		} );

	}

}
