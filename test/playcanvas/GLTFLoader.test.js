import { Asset } from 'playcanvas';
import { disposeModel, GLTFLoader } from '../../src/playcanvas/renderer/loaders/GLTFLoader.js';

describe( 'PlayCanvas GLTFLoader', () => {

	it( 'aborts when the application was destroyed before parsing', async () => {

		const loader = new GLTFLoader( { assets: null } );

		await expect( loader.parse( new ArrayBuffer( 4 ), 'tile.glb' ) ).rejects.toMatchObject( { name: 'AbortError' } );

	} );

	it( 'aborts and releases the asset when the application is destroyed while parsing', async () => {

		const app = {
			assets: {
				add: vi.fn(),
				remove: vi.fn(),
				load( asset ) {

					// the application is destroyed, then the load completes without a resource
					app.assets = null;
					asset.fire( 'load', asset );

				},
			},
		};
		const registry = app.assets;

		const loader = new GLTFLoader( app );

		await expect( loader.parse( new ArrayBuffer( 4 ), 'tile.glb' ) ).rejects.toMatchObject( { name: 'AbortError' } );
		expect( registry.add ).toHaveBeenCalledTimes( 1 );
		expect( registry.remove ).not.toHaveBeenCalled();

	} );

	it( 'disposes a model once the registry was released', () => {

		const asset = new Asset( 'tile', 'container', { url: 'tile.glb' } );
		const scene = { destroy: vi.fn() };

		expect( () => disposeModel( scene, asset, null ) ).not.toThrow();
		expect( scene.destroy ).toHaveBeenCalledTimes( 1 );

	} );

} );
