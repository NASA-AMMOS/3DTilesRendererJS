import { MathUtils, DataTexture, RedFormat, FloatType, LinearFilter } from 'three';
import { DataCache } from '../utils/DataCache.js';

// draws the image, decodes each pixel to meters, and returns a single-channel float DataTexture.
// The grid is padded with a one texel border, initialized by duplicating the edge texels, that is
// filled from neighboring tiles as they load so seams sample identical values on both sides.
// The elevation range is tracked per block in a "blocks x blocks" grid during the decode so the sub
// tiles reading subviews of the texture can derive tight bounding volumes without re-iterating.
function readImageData( image, canvas, decode, blocks ) {

	const { width, height } = image;
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
	ctx.drawImage( image, 0, 0 );

	const { data } = ctx.getImageData( 0, 0, width, height );
	ctx.clearRect( 0, 0, width, height );

	// decode into the interior of the padded grid, tracking the per-block elevation range
	const pw = width + 2;
	const ph = height + 2;
	const elevations = new Float32Array( pw * ph );
	const blockRanges = new Float32Array( 2 * blocks * blocks );
	for ( let i = 0, l = blocks * blocks; i < l; i ++ ) {

		blockRanges[ 2 * i + 0 ] = Infinity;
		blockRanges[ 2 * i + 1 ] = - Infinity;

	}

	for ( let y = 0; y < height; y ++ ) {

		for ( let x = 0; x < width; x ++ ) {

			const i = 4 * ( y * width + x );
			const value = decode( data[ i ], data[ i + 1 ], data[ i + 2 ] );
			elevations[ ( y + 1 ) * pw + x + 1 ] = value;

			const bi = 2 * ( Math.floor( y * blocks / height ) * blocks + Math.floor( x * blocks / width ) );
			if ( value < blockRanges[ bi + 0 ] ) blockRanges[ bi + 0 ] = value;
			if ( value > blockRanges[ bi + 1 ] ) blockRanges[ bi + 1 ] = value;

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
	texture.userData.blockRanges = blockRanges;
	texture.userData.blocks = blocks;
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

// ref counted cache of decoded elevation grids shared by the tiles reading subviews of each texture
export class GridCache extends DataCache {

	constructor( plugin ) {

		super();

		this.plugin = plugin;
		this.canvas = new OffscreenCanvas( 1, 1 );

	}

	async fetchItem( [ x, y, level ], signal ) {

		const { plugin } = this;
		const fetched = await plugin._source.fetchItem( [ x, y, level ], signal );
		const grid = readImageData( fetched.image, this.canvas, ( r, g, b ) => plugin.decodeElevation( r, g, b ), 2 ** plugin._extraLevels );
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
