import { GraphNode, Mesh, MeshInstance, NullGraphicsDevice, SHADERLANGUAGE_GLSL, SHADERLANGUAGE_WGSL, StandardMaterial } from 'playcanvas';
import { TilesFadePlugin } from '../../src/playcanvas/plugins/fade/TilesFadePlugin.js';

const canvas = {
	width: 1,
	height: 1,
	style: {},
	getContext() {

		return null;

	},
	addEventListener() {},
	removeEventListener() {},
};
const device = new NullGraphicsDevice( canvas );

function makeTiles() {

	return {
		cameras: [],
		visibleTiles: new Set(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		invokeOnePlugin: vi.fn(),
		markTileUsed: vi.fn(),
		traverse: vi.fn(),
	};

}

// a tile whose scene draws one mesh instance with each of the given materials
function makeTile( materials ) {

	const meshInstances = materials.map( material => new MeshInstance( new Mesh( device ), material, new GraphNode() ) );
	const scene = {
		findComponents: () => [ { meshInstances } ],
	};
	return { engineData: { scene } };

}

function getChunk( material, shaderLanguage, name ) {

	return material.getShaderChunks( shaderLanguage ).get( name );

}

describe( 'PlayCanvas TilesFadePlugin', () => {

	it( 'registers and disposes the base lifecycle', () => {

		const tiles = makeTiles();
		const plugin = new TilesFadePlugin();

		plugin.init( tiles );

		expect( plugin.tiles ).toBe( tiles );
		expect( tiles.addEventListener ).toHaveBeenCalledTimes( 4 );

		plugin.dispose();

		expect( tiles.removeEventListener ).toHaveBeenCalledTimes( 4 );
		expect( plugin.tiles ).toBeNull();

	} );

	it( 'skips the default glTF material and materials shared with other tiles', () => {

		const plugin = new TilesFadePlugin();
		const shared = new StandardMaterial();
		const defaultMaterial = new StandardMaterial();
		defaultMaterial.name = 'defaultGlbMaterial';

		const tileA = makeTile( [ shared ] );
		const tileB = makeTile( [ shared, defaultMaterial ] );
		plugin.prepareTileScene( tileA.engineData.scene, tileA );
		plugin.prepareTileScene( tileB.engineData.scene, tileB );

		// tile B has no material of its own, so it pops in and out instead of fading
		expect( plugin.setTileVisible( tileB, true ) ).toBe( false );

		plugin.setFadeState( tileB, 0.5, 0 );
		expect( getChunk( shared, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBeUndefined();
		expect( getChunk( defaultMaterial, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBeUndefined();

	} );

	it( 'adds the fade while a tile fades and removes it afterwards', () => {

		const plugin = new TilesFadePlugin();
		const material = new StandardMaterial();
		const tile = makeTile( [ material ] );
		plugin.prepareTileScene( tile.engineData.scene, tile );

		plugin.setFadeState( tile, 0.25, 0 );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' ) ).toContain( 'tilesFadeIn' );
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toContain( 'discard' );
		expect( getChunk( material, SHADERLANGUAGE_WGSL, 'litUserDeclarationPS' ) ).toContain( 'tilesFadeIn' );
		expect( getChunk( material, SHADERLANGUAGE_WGSL, 'litUserMainStartPS' ) ).toContain( 'discard' );
		expect( material.getParameter( 'tilesFadeIn' ).data ).toBe( 0.25 );
		expect( material.getParameter( 'tilesFadeOut' ).data ).toBe( 0 );

		// later fade values update the values, and add the fade code only once
		const fadingDeclaration = getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' );
		plugin.setFadeState( tile, 0.75, 0.1 );

		expect( material.getParameter( 'tilesFadeIn' ).data ).toBe( 0.75 );
		expect( material.getParameter( 'tilesFadeOut' ).data ).toBe( 0.1 );
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' ) ).toBe( fadingDeclaration );

		plugin.resetFadeState( tile );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' ) ).toBeUndefined();
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBeUndefined();
		expect( getChunk( material, SHADERLANGUAGE_WGSL, 'litUserDeclarationPS' ) ).toBeUndefined();
		expect( getChunk( material, SHADERLANGUAGE_WGSL, 'litUserMainStartPS' ) ).toBeUndefined();
		expect( material.getParameter( 'tilesFadeIn' ) ).toBeUndefined();
		expect( material.getParameter( 'tilesFadeOut' ) ).toBeUndefined();

	} );

	it( 'keeps the shader chunks the application set on a material', () => {

		const plugin = new TilesFadePlugin();
		const material = new StandardMaterial();
		const declaration = 'uniform vec3 skyColor;';
		const mainStart = 'vec3 tint = skyColor;';
		material.getShaderChunks( SHADERLANGUAGE_GLSL ).set( 'litUserDeclarationPS', declaration );
		material.getShaderChunks( SHADERLANGUAGE_GLSL ).set( 'litUserMainStartPS', mainStart );
		const tile = makeTile( [ material ] );
		plugin.prepareTileScene( tile.engineData.scene, tile );

		plugin.setFadeState( tile, 0.5, 0 );

		const fadingDeclaration = getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' );
		expect( fadingDeclaration ).toContain( 'tilesFadeIn' );
		expect( fadingDeclaration.endsWith( declaration ) ).toBe( true );
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ).endsWith( mainStart ) ).toBe( true );

		plugin.resetFadeState( tile );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' ) ).toBe( declaration );
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBe( mainStart );
		expect( getChunk( material, SHADERLANGUAGE_WGSL, 'litUserDeclarationPS' ) ).toBeUndefined();

	} );

	it( 'leaves a shader chunk the application replaced during a fade', () => {

		const plugin = new TilesFadePlugin();
		const material = new StandardMaterial();
		const tile = makeTile( [ material ] );
		plugin.prepareTileScene( tile.engineData.scene, tile );

		plugin.setFadeState( tile, 0.5, 0 );
		material.getShaderChunks( SHADERLANGUAGE_GLSL ).set( 'litUserDeclarationPS', 'uniform float custom;' );
		plugin.resetFadeState( tile );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserDeclarationPS' ) ).toBe( 'uniform float custom;' );
		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBeUndefined();

	} );

	it( 'releases the fade when a fading tile is disposed', () => {

		const plugin = new TilesFadePlugin();
		const material = new StandardMaterial();
		const tile = makeTile( [ material ] );
		plugin.prepareTileScene( tile.engineData.scene, tile );

		plugin.setFadeState( tile, 0.5, 0 );
		plugin.releaseTileScene( tile.engineData.scene, tile );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toBeUndefined();
		expect( material.getParameter( 'tilesFadeIn' ) ).toBeUndefined();

		// the material is free to belong to another tile, which fades with it
		const other = makeTile( [ material ] );
		plugin.prepareTileScene( other.engineData.scene, other );
		plugin.setFadeState( other, 0.5, 0 );

		expect( getChunk( material, SHADERLANGUAGE_GLSL, 'litUserMainStartPS' ) ).toContain( 'discard' );

	} );

} );
