import { FadeMaterialManager, getDitheredTileFadeMaterialPlugin } from '../../src/babylonjs/plugins/fade/FadeMaterialManager.js';
import { TilesFadePlugin } from '../../src/babylonjs/plugins/fade/TilesFadePlugin.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';

function makeTiles() {

	return {
		scene: { activeCamera: null },
		visibleTiles: new Set(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		invokeOnePlugin: vi.fn(),
		markTileUsed: vi.fn(),
		traverse: vi.fn(),
	};

}

describe( 'Babylon.js TilesFadePlugin', () => {

	it( 'detects the complete material plugin API', () => {

		class CompletePlugin {

			static GetOrCreate() {}
			getFadeBoundsToRef() {}
			setFadeBounds() {}
			resetFade() {}

		}

		expect( getDitheredTileFadeMaterialPlugin( {} ) ).toBeNull();
		expect( getDitheredTileFadeMaterialPlugin( {
			DitheredTileFadeMaterialPlugin: CompletePlugin,
		} ) ).toBe( CompletePlugin );

	} );

	it( 'falls through without registering a lifecycle when fading is unavailable', () => {

		const tiles = makeTiles();
		const plugin = new TilesFadePlugin();
		plugin._fadeMaterialManager = new FadeMaterialManager( null );
		const warning = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );

		plugin.init( tiles );
		plugin.init( tiles );

		expect( warning ).toHaveBeenCalledTimes( 1 );
		expect( warning ).toHaveBeenCalledWith( expect.stringContaining( 'Tiles will render normally without fading' ) );
		expect( tiles.addEventListener ).not.toHaveBeenCalled();
		expect( plugin.tiles ).toBeNull();
		expect( plugin.setTileVisible( {}, true ) ).toBe( false );
		expect( () => plugin.dispose() ).not.toThrow();
		expect( () => plugin.dispose() ).not.toThrow();
		expect( tiles.removeEventListener ).not.toHaveBeenCalled();

		warning.mockRestore();

	} );

	it( 'registers and disposes the base lifecycle when fading is available', () => {

		const tiles = makeTiles();
		const plugin = new TilesFadePlugin();

		expect( plugin._fadeMaterialManager.supported ).toBe( true );
		expect( () => new TilesFadePlugin().dispose() ).not.toThrow();

		plugin.init( tiles );

		expect( plugin.tiles ).toBe( tiles );
		expect( tiles.addEventListener ).toHaveBeenCalledTimes( 4 );
		expect( plugin.setTileVisible( { traversal: { wasSetActive: true, wasInFrustum: false } }, true ) ).toBe( false );

		plugin.dispose();

		expect( tiles.removeEventListener ).toHaveBeenCalledTimes( 4 );
		expect( plugin.tiles ).toBeNull();
		expect( plugin.setTileVisible( {}, true ) ).toBe( false );
		expect( () => plugin.dispose() ).not.toThrow();

	} );

	describe( 'tile eligibility', () => {

		let engine, scene, root, opaque, plugin, tiles, warning;

		beforeEach( () => {

			engine = new NullEngine();
			scene = new Scene( engine );
			root = new TransformNode( 'tile', scene );
			opaque = CreateBox( 'opaque', {}, scene );
			opaque.parent = root;
			opaque.material = new StandardMaterial( 'opaque', scene );
			tiles = makeTiles();
			plugin = new TilesFadePlugin();
			plugin.init( tiles );
			warning = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );

		} );

		afterEach( () => {

			plugin.dispose();
			scene.dispose();
			engine.dispose();
			warning.mockRestore();

		} );

		it.each( [ 'transparent', 'custom material', 'instances', 'thin instances' ] )( 'skips the entire tile for %s without partial preparation', kind => {

			const unsupported = CreateBox( 'unsupported', {}, scene );
			unsupported.parent = root;
			unsupported.material = new StandardMaterial( 'unsupported', scene );
			if ( kind === 'transparent' ) {

				unsupported.material.alpha = 0.5;

			} else if ( kind === 'custom material' ) {

				unsupported.material = new ShaderMaterial( 'custom', scene, {}, {} );

			} else if ( kind === 'instances' ) {

				unsupported.createInstance( 'instance' ).parent = root;

			} else {

				engine.getCaps().instancedArrays = true;
				unsupported.thinInstanceAdd( Matrix.Identity() );

			}

			plugin.prepareTileScene( root );
			plugin.prepareTileScene( root );

			expect( warning ).toHaveBeenCalledTimes( 1 );
			expect( warning ).toHaveBeenCalledWith( expect.stringContaining( 'This tile will render normally without fading' ) );
			expect( plugin._fadeMaterialManager.isSceneSupported( root ) ).toBe( false );
			expect( opaque.material.pluginManager?.getPlugin( 'DitheredTileFadeMaterialPlugin' ) ).toBeFalsy();

			const tile = {
				engineData: { scene: root },
				traversal: { wasSetActive: true, wasInFrustum: true },
				internal: { depthFromRenderedParent: 2 },
			};
			expect( plugin.setTileVisible( tile, true ) ).toBe( false );
			expect( plugin.setTileVisible( tile, false ) ).toBe( false );
			plugin._updateAfter();
			expect( plugin.fadingTiles ).toBe( 0 );
			expect( plugin._fadingOutCount ).toBe( 0 );
			expect( tiles.markTileUsed ).not.toHaveBeenCalled();
			expect( tiles.dispatchEvent ).not.toHaveBeenCalled();

			plugin.releaseTileScene( root );
			expect( () => plugin.releaseTileScene( root ) ).not.toThrow();

			unsupported.dispose();
			plugin.prepareTileScene( root );
			expect( plugin._fadeMaterialManager.isSceneSupported( root ) ).toBe( true );

		} );

		it( 'skips a tile whose root is an instance', () => {

			const instance = opaque.createInstance( 'root instance' );
			plugin.prepareTileScene( instance );
			expect( warning ).toHaveBeenCalledTimes( 1 );
			expect( plugin._fadeMaterialManager.isSceneSupported( instance ) ).toBe( false );
			plugin.releaseTileScene( instance );

		} );

		it( 'keeps supported tiles fading and releases their material state', () => {

			plugin.prepareTileScene( root );
			const tile = {
				engineData: { scene: root },
				traversal: { wasSetActive: true, wasInFrustum: true },
				internal: { depthFromRenderedParent: 2 },
			};

			expect( plugin.setTileVisible( tile, false ) ).toBe( true );
			expect( plugin.fadingTiles ).toBe( 1 );
			plugin._updateAfter();
			expect( tiles.markTileUsed ).toHaveBeenCalledWith( tile );
			expect( warning ).not.toHaveBeenCalled();

			plugin._fadeManager.completeAllFades();
			expect( tiles.invokeOnePlugin ).toHaveBeenCalled();
			expect( plugin.fadingTiles ).toBe( 0 );
			plugin.releaseTileScene( root );
			expect( plugin._fadeMaterialManager.isSceneSupported( root ) ).toBe( false );

		} );

	} );

} );
