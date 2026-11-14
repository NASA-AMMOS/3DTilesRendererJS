import { DataTexture, NearestFilter, RGBAIntegerFormat, UnsignedByteType } from 'three';

// Points are drawn larger than the point spacing to cover the gaps between them - potree uses
// the same factor
export const SPACING_COVERAGE_FACTOR = 1.7;

// Id built from an octant path ("" for the root, "0" for its first child, ...), matching the one
// the shader accumulates while walking so the "node" and "tile" debug colors can be compared directly.
export function idFromOctantPath( path ) {

	let id = 0;
	for ( let i = 0, l = path.length; i < l; i ++ ) {

		id = ( id * 8 + parseInt( path[ i ] ) + 1 ) % 16777216;

	}

	return id;

}

// Octant path of an implicit octree tile, one digit per level with the octant as 4·x + 2·y + z,
// the convention of the shader's walk.
export function octantPathFromImplicitTile( level, x, y, z ) {

	let path = '';
	for ( let bit = level - 1; bit >= 0; bit -- ) {

		path += 4 * ( ( x >> bit ) & 1 ) + 2 * ( ( y >> bit ) & 1 ) + ( ( z >> bit ) & 1 );

	}

	return path;

}

// The node hierarchy is stored in an integer texture so the shader reads the mask and offset
// bytes directly rather than converting them back from normalized floats. Nodes fill it in
// row major order, and it is square so it stays well clear of the platform size limit.
function createNodesTexture( size ) {

	const texture = new DataTexture(
		new Uint8Array( size * size * 4 ),
		size,
		size,
		RGBAIntegerFormat,
		UnsignedByteType,
	);
	texture.internalFormat = 'RGBA8UI';
	texture.minFilter = NearestFilter;
	texture.magFilter = NearestFilter;
	return texture;

}

/**
 * The active node hierarchy of an octree read by PointCloudMaterial's lod walk: per texel the
 * active-children octant mask (r) and the offset to the first child texel (g, b).
 * @private
 */
export class ActiveNodesTexture {

	constructor() {

		this.texture = createNodesTexture( 1 );

	}

	/**
	 * Encodes the given octant paths, sorted by level then path so a node's children are
	 * consecutive and in octant order, as the shader's walk expects. Missing ancestors are added so
	 * the set is always a connected tree.
	 * @param {Iterable<string>} paths
	 * @returns {boolean} Whether the texture was replaced by a larger one.
	 */
	update( paths ) {

		const set = new Set( [ '' ] );
		for ( const path of paths ) {

			for ( let i = path.length; i > 0 && ! set.has( path.slice( 0, i ) ); i -- ) {

				set.add( path.slice( 0, i ) );

			}

		}

		const list = [ ...set ].sort( ( a, b ) => {

			if ( a.length !== b.length ) return a.length - b.length;
			return a < b ? - 1 : 1;

		} );

		// grow the texture when the nodes no longer fit
		let replaced = false;
		let texture = this.texture;
		const size = Math.ceil( Math.sqrt( list.length ) );
		if ( size > texture.image.width ) {

			texture.dispose();
			texture = createNodesTexture( size );
			this.texture = texture;
			replaced = true;

		}

		const data = texture.image.data;
		data.fill( 0 );

		const indexByPath = new Map();
		for ( let i = 0, l = list.length; i < l; i ++ ) {

			const path = list[ i ];
			indexByPath.set( path, i );

			// byte 3: potree's density lod offset, 100 being its "no offset" encoding
			data[ i * 4 + 3 ] = 100;

			if ( i === 0 ) {

				continue;

			}

			const parentIndex = indexByPath.get( path.slice( 0, - 1 ) );

			// bytes 1 and 2 are the offset to the first child, and siblings are consecutive so
			// the first one encountered sets it
			if ( data[ parentIndex * 4 ] === 0 ) {

				const offset = i - parentIndex;
				data[ parentIndex * 4 + 1 ] = offset >> 8;
				data[ parentIndex * 4 + 2 ] = offset & 0xff;

			}

			// byte 0 is the child occupancy mask, and the path's last digit is the node's octant
			const octant = parseInt( path.charAt( path.length - 1 ) );
			data[ parentIndex * 4 ] |= 1 << octant;

		}

		texture.needsUpdate = true;
		return replaced;

	}

	dispose() {

		this.texture.dispose();

	}

}
