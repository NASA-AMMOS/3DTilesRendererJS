import { TilesRendererBase } from '../../src/core/renderer';

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

} );
