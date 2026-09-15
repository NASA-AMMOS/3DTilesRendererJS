import { TilesRendererBase, LRUCache, UNLOADED, LOADED } from '../../src/core/renderer';

describe( 'TilesRendererBase', () => {

	it( 'should count tiles refused by a full cache in stats.refused', () => {

		const renderer = new TilesRendererBase();
		renderer.lruCache = new LRUCache();
		renderer.lruCache.maxSize = 0;

		const tile = { internal: { loadingState: UNLOADED } };
		renderer.queueTileForDownload( tile );
		renderer.queueTileForDownload( tile );
		renderer.queueTileForDownload( { internal: { loadingState: UNLOADED } } );
		renderer.queueTileForDownload( { internal: { loadingState: LOADED } } );

		expect( renderer.stats.refused ).toBe( 2 );
		expect( renderer.queuedTiles ).toHaveLength( 0 );

	} );

	it( 'should only queue a tile once per update', () => {

		const renderer = new TilesRendererBase();
		renderer.lruCache = new LRUCache();

		const tile = { internal: { loadingState: UNLOADED } };
		renderer.queueTileForDownload( tile );
		renderer.queueTileForDownload( tile );

		expect( renderer.queuedTiles ).toHaveLength( 1 );
		expect( renderer.stats.refused ).toBe( 0 );

	} );

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

} );
