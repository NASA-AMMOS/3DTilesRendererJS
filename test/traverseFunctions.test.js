import { traverseAncestors, traverseSet } from '../src/core/renderer/tiles/traverseFunctions.js';

describe( 'traverseSet', () => {

	function makeTile( name, ...children ) {

		return { name, children };

	}

	it( 'should visit all tiles in depth-first order', () => {

		/**
		 *             root
		 *          /   |   \
		 *         a    b    c
		 *       / | \      /
		 *      d  e  f    g
		 *               / | \
		 *              h  i  j
		 */


		const h = makeTile( 'h' );
		const i = makeTile( 'i' );
		const j = makeTile( 'j' );

		const d = makeTile( 'd' );
		const e = makeTile( 'e' );
		const f = makeTile( 'f' );

		const b = makeTile( 'b' );
		const a = makeTile( 'a', d, e, f );

		const g = makeTile( 'g', h, i, j );

		const c = makeTile( 'c', g );

		const root = makeTile( 'root', a, b, c );


		const visited = [];

		traverseSet( root, null, ( tile, parent, depth ) => visited.push( `${tile.name}-${depth}-${parent?.name ?? 'none'}` ) );

		expect( visited ).toHaveLength( 11 );
		expect( visited ).toEqual( [ 'root-0-none', 'a-1-root', 'd-2-a', 'e-2-a', 'f-2-a', 'b-1-root', 'c-1-root', 'g-2-c', 'h-3-g', 'i-3-g', 'j-3-g' ] );

	} );

	it( 'should exit traversal if beforeCb returns true', () => {

		/**
		 *             root
		 *          /   |   \
		 *         a    b    c
		 *       / | \      /
		 *      d  e  f    g
		 *               / | \
		 *              h  i  j
		 */


		const h = makeTile( 'h' );
		const i = makeTile( 'i' );
		const j = makeTile( 'j' );

		const d = makeTile( 'd' );
		const e = makeTile( 'e' );
		const f = makeTile( 'f' );

		const b = makeTile( 'b' );
		const a = makeTile( 'a', d, e, f );

		const g = makeTile( 'g', h, i, j );

		const c = makeTile( 'c', g );

		const root = makeTile( 'root', a, b, c );


		const visited = [];

		const beforeCb = ( tile ) => {

			if ( tile.name === 'c' ) {

				return true;

			}

		};

		traverseSet( root, beforeCb, t => visited.push( t.name ) );

		expect( visited ).toHaveLength( 7 );
		expect( visited ).toEqual( [ 'root', 'a', 'd', 'e', 'f', 'b', 'c' ] );

	} );

} );

describe( 'traverseAncestors', () => {

	function makeTile( name, parent = undefined ) {

		return { name, parent };

	}

	it( 'visit all ancestry chain', () => {

		const root = makeTile( 'root' );

		const lod1 = makeTile( '1', root );
		const lod2 = makeTile( '2', lod1 );
		const lod3 = makeTile( '3', lod2 );
		const lod4 = makeTile( '4', lod3 );

		const visited = [];

		traverseAncestors( lod4, tile => visited.push( tile.name ) );

		expect( visited ).toEqual( [ '4', '3', '2', '1', 'root' ] );

	} );

} );
