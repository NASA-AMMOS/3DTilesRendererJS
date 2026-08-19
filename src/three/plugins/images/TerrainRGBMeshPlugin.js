import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, DataTexture, RedFormat, FloatType, LinearFilter } from 'three';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { GeneratedSurfacePlugin, TILE_X, TILE_Y, TILE_LEVEL } from './GeneratedSurfacePlugin.js';

const HEIGHT_GRID = Symbol( 'HEIGHT_GRID' );

// vertex grid resolution per tile; the raster is bilinear-sampled into it
const MESH_SIZE = 128;

// draws the image, decodes each pixel to meters, and returns a single-channel float DataTexture
function readImageData( image, canvas, decode ) {

	const { width, height } = image;
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
	ctx.drawImage( image, 0, 0 );

	const { data } = ctx.getImageData( 0, 0, width, height );
	ctx.clearRect( 0, 0, width, height );

	const elevations = new Float32Array( width * height );
	for ( let i = 0, l = width * height; i < l; i ++ ) {

		elevations[ i ] = decode( data[ i * 4 ], data[ i * 4 + 1 ], data[ i * 4 + 2 ] );

	}

	const texture = new DataTexture( elevations, width, height, RedFormat, FloatType );
	texture.minFilter = LinearFilter;
	texture.magFilter = LinearFilter;
	texture.needsUpdate = true;
	return texture;

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

		tile[ HEIGHT_GRID ] = grid;

		let res;
		try {

			res = await super.parseToMesh( buffer, tile, extension, url, abortSignal );

		} finally {

			delete tile[ HEIGHT_GRID ];

		}

		return res;

	}

	// fixed vertex grid resolution
	getSurfaceResolution( tile, planar, target ) {

		target.lonVerts = MESH_SIZE;
		target.latVerts = MESH_SIZE;
		return target;

	}

	// bilinear sample of the decoded grid, ( u, v ) origin at the south-west corner
	getElevation( u, v, tile ) {

		const grid = tile[ HEIGHT_GRID ];
		if ( ! grid ) {

			return 0;

		}

		const { data, width, height } = grid.image;
		const fx = MathUtils.clamp( u, 0, 1 ) * ( width - 1 );
		const fy = MathUtils.clamp( v, 0, 1 ) * ( height - 1 );
		const x0 = Math.floor( fx );
		const y0 = Math.floor( fy );
		const x1 = Math.min( x0 + 1, width - 1 );
		const y1 = Math.min( y0 + 1, height - 1 );
		const tx = fx - x0;
		const ty = fy - y0;

		const h0 = data[ y0 * width + x0 ] * ( 1 - tx ) + data[ y0 * width + x1 ] * tx;
		const h1 = data[ y1 * width + x0 ] * ( 1 - tx ) + data[ y1 * width + x1 ] * tx;
		return ( h0 * ( 1 - ty ) + h1 * ty ) * this.heightScale;

	}

	// planar shapes skip the base's per-vertex loop, so build the displaced grid here
	_createPlanarMesh( tile ) {

		const grid = tile[ HEIGHT_GRID ];
		if ( ! grid ) {

			return super._createPlanarMesh( tile );

		}

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

		const geometry = new PlaneGeometry( 2 * sx, 2 * sy, MESH_SIZE, MESH_SIZE );
		const mesh = new Mesh( geometry, new MeshBasicMaterial() );
		mesh.position.set( x, y, z );

		const uvRange = this._tiling.getTileContentUVBounds( tx, ty, level );
		const { position, uv } = geometry.attributes;
		for ( let i = 0; i < uv.count; i ++ ) {

			const u = uv.getX( i );
			const v = uv.getY( i );

			position.setZ( i, this.getElevation( u, v, tile ) );
			uv.setXY( i,
				MathUtils.mapLinear( u, 0, 1, uvRange[ 0 ], uvRange[ 2 ] ),
				MathUtils.mapLinear( v, 0, 1, uvRange[ 1 ], uvRange[ 3 ] ),
			);

		}

		position.needsUpdate = true;
		geometry.computeVertexNormals();
		return mesh;

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
