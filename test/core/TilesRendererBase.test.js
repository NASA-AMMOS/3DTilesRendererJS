import { TilesRendererBase } from '../../src/core/renderer';

describe( 'TilesRendererBase', () => {

	it( 'should unregister plugin by name', () => {

		const renderer = new TilesRendererBase();

		renderer.registerPlugin( { name: 'test' } );

		expect( renderer.unregisterPlugin( 'test' ) ).toBe( true );

	} );

} );
