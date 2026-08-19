import { MathUtils, DataTexture, RedFormat, FloatType, LinearFilter } from 'three';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { GeneratedSurfacePlugin, TILE_X, TILE_Y, TILE_LEVEL } from './GeneratedSurfacePlugin.js';

const HEIGHT_GRID = Symbol( 'HEIGHT_GRID' );

// vertex grid resolution per tile; the raster is bilinear-sampled into it
const MESH_SIZE = 128;

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

	// decode into the interior of the padded grid
	const pw = width + 2;
	const ph = height + 2;
	const elevations = new Float32Array( pw * ph );
	for ( let y = 0; y < height; y ++ ) {

		for ( let x = 0; x < width; x ++ ) {

			const i = 4 * ( y * width + x );
			elevations[ ( y + 1 ) * pw + x + 1 ] = decode( data[ i ], data[ i + 1 ], data[ i + 2 ] );

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

function getTileKey( tile ) {

	return `${ tile[ TILE_LEVEL ] }_${ tile[ TILE_X ] }_${ tile[ TILE_Y ] }`;

}

/**
 * Generates displaced terrain meshes from raster Terrain-RGB elevation tiles, extending
 * {@link GeneratedSurfacePlugin}. Fetches and decodes the elevation tile for each surface tile and
 * displaces the generated vertices.
 *
 * @param {Object} [options]
 * @param {string} options.url XYZ url template, e.g. `.../{z}/{x}/{y}.png`.
 * @param {number} [options.tileDimension=512] Source tile pixel size; drives LOD.
 * @param {number} [options.maxZoom=15] Highest zoom level the source provides.
 * @param {number} [options.heightScale=1] Vertical exaggeration.
 * @param {('ellipsoid'|'planar')} [options.shape='ellipsoid'] Surface shape.
 */
export class TerrainRGBMeshPlugin extends GeneratedSurfacePlugin {

	constructor( options = {} ) {

		const {
			url = null,

			// the source's real tile pixel size; drives LOD so higher-res sources refine correctly
			tileDimension = 512,

			// highest zoom the source provides
			maxZoom = 15,

			heightScale = 1,
			...rest
		} = options;

		// an overlay passed through options only textures the terrain; tiling comes from the source
		super( { ...rest } );

		this.name = 'TERRAIN_RGB_MESH_PLUGIN';
		this.heightScale = heightScale;
		this._source = new XYZImageSource( { url, tileDimension, levels: maxZoom } );
		this._canvas = new OffscreenCanvas( 1, 1 );
		this._tileMap = new Map();

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

		if ( extension !== 'generated_surface' ) {

			return null;

		}

		// decode the elevation and pass it to the base mesh build through the tile
		const grid = await this._loadHeightGrid( tile, abortSignal );
		if ( abortSignal.aborted ) {

			return null;

		}

		// retain the grid for sampling and stitch borders with any loaded neighbors, updating the
		// neighbor meshes that received new edge data
		tile[ HEIGHT_GRID ] = grid;
		this._tileMap.set( getTileKey( tile ), tile );
		this._stitchNeighbors( tile );

		return super.parseToMesh( buffer, tile, extension, url, abortSignal );

	}

	// exchanges edge texels with the loaded neighbor tiles at the same level so both sides of a seam
	// sample identical values, and re-displaces the neighbor meshes that received new data
	_stitchNeighbors( tile ) {

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const grid = tile[ HEIGHT_GRID ];

		// grid rows run south to north, so the tile y step is flipped when the tiling is
		const { tileCountX } = this._tiling.getLevel( level );
		const yDir = this._tiling.flipY ? - 1 : 1;

		for ( let dx = - 1; dx <= 1; dx ++ ) {

			for ( let dy = - 1; dy <= 1; dy ++ ) {

				if ( dx === 0 && dy === 0 ) {

					continue;

				}

				// wrap the neighbor x so seams close across the antimeridian
				const nx = ( x + dx + tileCountX ) % tileCountX;
				const ny = y + dy * yDir;
				const neighbor = this._tileMap.get( `${ level }_${ nx }_${ ny }` );
				if ( neighbor ) {

					fillBorder( grid, neighbor[ HEIGHT_GRID ], dx, dy );
					fillBorder( neighbor[ HEIGHT_GRID ], grid, - dx, - dy );
					this._updateTileMesh( neighbor );

				}

			}

		}

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const grid = tile[ HEIGHT_GRID ];
		if ( grid ) {

			grid.dispose();
			delete tile[ HEIGHT_GRID ];
			this._tileMap.delete( getTileKey( tile ) );

		}

	}

	// fixed vertex grid resolution
	getSurfaceResolution( tile, planar, target ) {

		target.lonVerts = MESH_SIZE;
		target.latVerts = MESH_SIZE;
		return target;

	}

	// bilinear sample of the decoded grid, ( u, v ) origin at the south-west corner. The grid texel
	// centers are inset half a texel from the tile bounds, so samples at the edges interpolate into
	// the border texels stitched from the neighboring tiles and both sides of a seam agree
	getElevation( u, v, tile ) {

		const grid = tile[ HEIGHT_GRID ];
		if ( ! grid ) {

			return 0;

		}

		const { data, width, height } = grid.image;
		const fx = MathUtils.clamp( u, 0, 1 ) * ( width - 2 ) + 0.5;
		const fy = MathUtils.clamp( v, 0, 1 ) * ( height - 2 ) + 0.5;
		const x0 = Math.floor( fx );
		const y0 = Math.floor( fy );
		const x1 = x0 + 1;
		const y1 = y0 + 1;
		const tx = fx - x0;
		const ty = fy - y0;

		const h0 = data[ y0 * width + x0 ] * ( 1 - tx ) + data[ y0 * width + x1 ] * tx;
		const h1 = data[ y1 * width + x0 ] * ( 1 - tx ) + data[ y1 * width + x1 ] * tx;
		return ( h0 * ( 1 - ty ) + h1 * ty ) * this.heightScale;

	}

	// packed RGB to meters; override for other encodings
	decodeElevation( r, g, b ) {

		return - 10000 + ( r * 65536 + g * 256 + b ) * 0.1;

	}

	// fetch the elevation tile and decode it into a float DataTexture of meters
	async _loadHeightGrid( tile, abortSignal ) {

		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];

		const fetched = await this._source.fetchItem( [ x, y, level ], abortSignal );

		// fetched bitmap is flipped on Y, so row 0 is the tile's south edge
		const grid = readImageData( fetched.image, this._canvas, ( r, g, b ) => this.decodeElevation( r, g, b ) );

		this._source.disposeItem( fetched );
		return grid;

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
