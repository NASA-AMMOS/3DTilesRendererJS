import { Group } from 'three';
import { TilesRenderer } from '../../src/three/renderer/tiles/TilesRenderer.js';
import { UnloadTilesPlugin } from '../../src/three/plugins/UnloadTilesPlugin.js';

// waits for the plugin's unload, which the cache schedules in a microtask
const nextTick = () => new Promise( resolve => queueMicrotask( resolve ) );

const createTile = () => ( { engineData: { scene: new Group() } } );

describe( 'UnloadTilesPlugin', () => {

	let tiles, plugin, unload;
	beforeEach( () => {

		tiles = new TilesRenderer();
		tiles.calculateBytesUsed = () => 100;

		// the test tiles have no traversal data to order them by
		tiles.lruCache.unloadPriorityCallback = () => 0;

		plugin = new UnloadTilesPlugin();
		tiles.registerPlugin( plugin );
		tiles.dispatchEvent( { type: 'update-before' } );

		unload = vi.spyOn( plugin, 'unloadTileFromGPU' );

	} );

	afterEach( () => {

		tiles.unregisterPlugin( plugin );
		vi.restoreAllMocks();

	} );

	it( 'should keep a revisited tile resident when another hidden tile is unloaded.', async () => {

		plugin.bytesTarget = 100;

		const revisited = createTile();
		const other = createTile();

		// the byte target keeps the hidden tile on the GPU
		tiles.setTileVisible( revisited, true );
		tiles.setTileVisible( revisited, false );
		await nextTick();

		tiles.setTileVisible( revisited, true );
		tiles.setTileVisible( other, true );
		tiles.setTileVisible( other, false );
		await nextTick();

		expect( unload ).toHaveBeenCalledExactlyOnceWith( other.engineData.scene, other );
		expect( plugin.estimatedGpuBytes ).toBe( 100 );

	} );

	it( 'should keep a tile resident when it is shown again before unloading.', async () => {

		const tile = createTile();

		tiles.setTileVisible( tile, true );
		tiles.setTileVisible( tile, false );
		tiles.setTileVisible( tile, true );
		await nextTick();

		expect( unload ).not.toHaveBeenCalled();
		expect( plugin.estimatedGpuBytes ).toBe( 100 );

		// the tile is still tracked, so it unloads once hidden again
		tiles.setTileVisible( tile, false );
		await nextTick();

		expect( unload ).toHaveBeenCalledExactlyOnceWith( tile.engineData.scene, tile );
		expect( plugin.estimatedGpuBytes ).toBe( 0 );

	} );

} );
