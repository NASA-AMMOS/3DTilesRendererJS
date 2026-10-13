import { Group } from 'three';
import { TilesRenderer } from '../../src/three/renderer/tiles/TilesRenderer.js';
import { UnloadTilesPlugin } from '../../src/three/plugins/UnloadTilesPlugin.js';

describe( 'UnloadTilesPlugin', () => {

	afterEach( () => {

		vi.restoreAllMocks();

	} );

	it( 'should keep a revisited tile resident when another hidden tile is unloaded.', async () => {

		const tiles = new TilesRenderer();
		tiles.lruCache.unloadPriorityCallback = () => 0;
		const plugin = new UnloadTilesPlugin( { bytesTarget: 100 } );
		tiles.registerPlugin( plugin );
		tiles.dispatchEvent( { type: 'update-before' } );
		tiles.calculateBytesUsed = () => 100;
		const unload = vi.spyOn( plugin, 'unloadTileFromGPU' );
		const firstTile = { engineData: { scene: new Group() } };
		const secondTile = { engineData: { scene: new Group() } };

		// The budget retains this hidden tile, but it is eligible for eviction.
		tiles.setTileVisible( firstTile, true );
		tiles.setTileVisible( firstTile, false );
		await Promise.resolve();
		expect( plugin.estimatedGpuBytes ).toBe( 100 );

		// Revisiting the first tile must protect it in the plugin's GPU cache.
		tiles.setTileVisible( firstTile, true );
		tiles.setTileVisible( secondTile, true );
		tiles.setTileVisible( secondTile, false );
		await Promise.resolve();

		expect( unload ).toHaveBeenCalledExactlyOnceWith( secondTile.engineData.scene, secondTile );
		expect( plugin.estimatedGpuBytes ).toBe( 100 );
		expect( plugin.lruCache.has( firstTile ) ).toBe( true );

		// The first tile must still be tracked so it can be unloaded later.
		plugin.bytesTarget = 0;
		tiles.setTileVisible( firstTile, false );
		await Promise.resolve();
		expect( unload ).toHaveBeenLastCalledWith( firstTile.engineData.scene, firstTile );
		expect( unload ).toHaveBeenCalledTimes( 2 );
		expect( plugin.estimatedGpuBytes ).toBe( 0 );

		tiles.unregisterPlugin( plugin );
		await Promise.resolve();

	} );

	it( 'should retain a tile shown again before scheduled unloading runs.', async () => {

		const tiles = new TilesRenderer();
		const plugin = new UnloadTilesPlugin();
		tiles.registerPlugin( plugin );
		tiles.dispatchEvent( { type: 'update-before' } );
		tiles.calculateBytesUsed = () => 100;
		const unload = vi.spyOn( plugin, 'unloadTileFromGPU' );
		const tile = { engineData: { scene: new Group() } };

		tiles.setTileVisible( tile, true );
		tiles.setTileVisible( tile, false );
		tiles.setTileVisible( tile, true );
		await Promise.resolve();

		expect( unload ).not.toHaveBeenCalled();
		expect( plugin.estimatedGpuBytes ).toBe( 100 );
		expect( plugin.lruCache.has( tile ) ).toBe( true );

		tiles.setTileVisible( tile, false );
		await Promise.resolve();
		expect( unload ).toHaveBeenCalledExactlyOnceWith( tile.engineData.scene, tile );
		expect( plugin.estimatedGpuBytes ).toBe( 0 );

		tiles.unregisterPlugin( plugin );
		await Promise.resolve();

	} );

} );
