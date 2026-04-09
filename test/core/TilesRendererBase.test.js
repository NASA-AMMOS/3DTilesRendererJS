import { TilesRendererBase } from '../../src/core/renderer';
import { XYZTilesPlugin } from '../../src/three/plugins/images/EPSGTilesPlugin.js';
import { TILE_LEVEL, TILE_X, TILE_Y } from '../../src/three/plugins/images/ImageFormatPlugin.js';

describe( 'TilesRendererBase', () => {

	it( 'should unregister plugin by name', () => {

		const renderer = new TilesRendererBase();

		renderer.registerPlugin( { name: 'test' } );

		expect( renderer.unregisterPlugin( 'test' ) ).toBe( true );

	} );

	it( 'should preprocess newly appended children even if earlier children were already processed', () => {

		const renderer = new TilesRendererBase();
		const processedChild = { children: [] };
		const unprocessedChild = { children: [] };
		const parent = {
			children: [ processedChild, unprocessedChild ],
		};

		renderer.preprocessNode( parent, '', null );
		renderer.preprocessNode( processedChild, '', parent );

		expect( processedChild.traversal ).toBeDefined();
		expect( unprocessedChild.traversal ).toBeUndefined();

		renderer.ensureChildrenArePreprocessed( parent, true );

		expect( unprocessedChild.traversal ).toBeDefined();
		expect( unprocessedChild.parent ).toBe( parent );

	} );

	it( 'should prune and rebuild image tile children without duplicating retained nodes', async () => {

		const renderer = new TilesRendererBase();
		const plugin = new XYZTilesPlugin( {
			url: 'https://example.com/{z}/{x}/{y}.png',
			levels: 3,
		} );

		renderer.registerPlugin( plugin );
		await plugin.imageSource.init();

		const root = {
			children: [],
			[ TILE_LEVEL ]: - 1,
			[ TILE_X ]: 0,
			[ TILE_Y ]: 0,
		};

		renderer.preprocessNode( root, '', null );
		renderer.rootTileset = { root };
		renderer.ensureChildrenArePreprocessed( root, true );

		const tile = root.children[ 0 ];
		renderer.ensureChildrenArePreprocessed( tile, true );

		const originalKeys = new Set( tile.children.map( child => `${ child[ TILE_LEVEL ] }:${ child[ TILE_X ] }:${ child[ TILE_Y ] }` ) );
		expect( originalKeys.size ).toBeGreaterThan( 1 );

		root.traversal.used = true;
		root.traversal.usedLastFrame = true;
		tile.traversal.used = true;
		tile.traversal.usedLastFrame = true;

		const retainedChild = tile.children[ 0 ];
		retainedChild.traversal.used = true;
		retainedChild.traversal.usedLastFrame = true;

		plugin.pruneUnusedSubtrees();

		expect( tile.children ).toHaveLength( 1 );
		expect( tile.children[ 0 ] ).toBe( retainedChild );

		renderer.ensureChildrenArePreprocessed( tile, true );

		const rebuiltKeys = tile.children.map( child => `${ child[ TILE_LEVEL ] }:${ child[ TILE_X ] }:${ child[ TILE_Y ] }` );
		expect( new Set( rebuiltKeys ) ).toEqual( originalKeys );
		expect( rebuiltKeys ).toHaveLength( originalKeys.size );

	} );

} );
