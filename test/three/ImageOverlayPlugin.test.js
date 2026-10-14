import { BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { ImageOverlayPlugin } from '../../src/plugins.js';
import { WGS84_ELLIPSOID } from '../../src/three/renderer/math/GeoConstants.js';

// Builds the minimal structures needed to exercise the tile splitting logic
// without a renderer: a plugin with one stub overlay that always wants to
// split, and a loaded tile scene containing a single 100 x 100 m quad.
function createSplitFixture() {

	const plugin = new ImageOverlayPlugin( { resolution: 256 } );
	plugin.tiles = {
		surface: WGS84_ELLIPSOID,
		processNodeQueue: { remove() {} },
		lruCache: { remove() {} },
	};

	const tile = {
		refine: 'REPLACE',
		geometricError: 0.3,
		boundingVolume: { box: [ 0, 0, 0, 50, 0, 0, 0, 50, 0, 0, 0, 1 ] },
		children: [],
		content: { uri: './tile.glb' },
		internal: { virtualChildCount: 0 },
		engineData: { transformInverse: new Matrix4() },
	};

	const overlay = { frame: null, shouldSplit: () => true };
	plugin.overlayInfo.set( overlay, {
		tileInfo: new Map( [[ tile, { target: {}, range: [ 0, 0, 1, 1 ] } ]] ),
	} );

	const scene = new Group();
	const mesh = new Mesh( new PlaneGeometry( 100, 100 ), new MeshBasicMaterial() );
	mesh.position.set( WGS84_ELLIPSOID.radius.x, 0, 0 );
	scene.add( mesh );
	scene.updateMatrixWorld( true );

	return { plugin, tile, scene };

}

describe( 'ImageOverlayPlugin tile splitting', () => {

	it( 'raises the tile geometric error to the overlay texel size while splits exist', async () => {

		const { plugin, tile, scene } = createSplitFixture();
		await plugin.expandVirtualChildren( scene, tile );

		// one texel of the 256 px overlay texture spans contentSize / resolution,
		// here the diagonal of a 100 x 100 quad divided by 256
		const texelError = Math.sqrt( 2 * 100 * 100 ) / 256;
		expect( tile.children.length ).toBeGreaterThan( 0 );
		expect( tile.internal.virtualChildCount ).toBe( tile.children.length );
		expect( tile.geometricError ).toBeCloseTo( texelError, 10 );

		// split children inherit half the raised error, keeping the ladder halving
		tile.children.forEach( child => {

			expect( child.geometricError ).toBeCloseTo( texelError / 2, 10 );

		} );

	} );

	it( 'does not raise the error of tiles that produce no splits', async () => {

		const { plugin, tile, scene } = createSplitFixture();
		for ( const info of plugin.overlayInfo.values() ) {

			info.tileInfo.get( tile ).target = null;

		}

		await plugin.expandVirtualChildren( scene, tile );

		expect( tile.children.length ).toBe( 0 );
		expect( tile.geometricError ).toBe( 0.3 );

	} );

	it( 'splits additive tiles without raising their geometric error', async () => {

		const { plugin, tile, scene } = createSplitFixture();
		tile.refine = 'ADD';
		await plugin.expandVirtualChildren( scene, tile );

		expect( tile.children.length ).toBeGreaterThan( 0 );
		expect( tile.geometricError ).toBe( 0.3 );

		plugin._removeVirtualChildren( tile );

		expect( tile.refine ).toBe( 'ADD' );
		expect( tile.geometricError ).toBe( 0.3 );

	} );

	it( 'restores the original geometric error when splits are removed', async () => {

		const { plugin, tile, scene } = createSplitFixture();
		await plugin.expandVirtualChildren( scene, tile );
		expect( tile.geometricError ).not.toBe( 0.3 );

		plugin._removeVirtualChildren( tile );

		expect( tile.children.length ).toBe( 0 );
		expect( tile.internal.virtualChildCount ).toBe( 0 );
		expect( tile.refine ).toBe( 'REPLACE' );
		expect( tile.geometricError ).toBe( 0.3 );

	} );

} );

describe( 'ImageOverlayPlugin overlay lifecycle', () => {

	it( 'skips scene initialization when a tile has no controller yet', async () => {

		const plugin = new ImageOverlayPlugin();
		const overlay = { isReady: true };
		const tile = {};
		const scene = new Group();

		plugin.tiles = { surface: WGS84_ELLIPSOID };
		plugin.overlayInfo.set( overlay, {
			controller: new AbortController(),
			tileInfo: new Map(),
		} );

		await expect( plugin._initTileSceneOverlayInfo( scene, tile, overlay ) ).resolves.toBeUndefined();

	} );

	it( 'uses a pending tile scene when adding an overlay during processing', async () => {

		const plugin = new ImageOverlayPlugin();
		const scene = new Group();
		const tile = { engineData: { scene: null } };
		let initializedScene = null;

		plugin.tiles = { dispatchEvent() {} };
		plugin.processedTiles.add( tile );
		plugin.pendingTiles.set( tile, scene );
		plugin.tileControllers.set( tile, new AbortController() );
		plugin._initTileOverlayInfo = () => {};

		plugin._initTileSceneOverlayInfo = value => {

			initializedScene = value;
			return Promise.resolve();

		};

		plugin._updateLayers = () => {};

		plugin.addOverlay( {
			frame: null,
			init: () => Promise.resolve(),
			setResolution() {},
		} );

		expect( initializedScene ).toBe( scene );
		await Promise.resolve();

	} );

	it( 'keeps every mesh layer uniform slot defined while overlays are added and removed', () => {

		const plugin = new ImageOverlayPlugin();
		const scene = new Group();
		const mesh = new Mesh( new PlaneGeometry( 1, 1 ), new MeshBasicMaterial() );
		const tile = { engineData: { scene: null } };
		const firstOverlay = { alphaInvert: false, alphaMask: false };
		const secondOverlay = { alphaInvert: true, alphaMask: false };
		const firstTarget = {};
		const attribute = new BufferAttribute( new Float32Array( 12 ), 3 );

		scene.add( mesh );
		plugin.tiles = { recalculateBytesUsed() {} };
		plugin.pendingTiles.set( tile, scene );
		plugin.tileControllers.set( tile, new AbortController() );
		plugin._wrapMaterials( scene );
		plugin.overlays.push( firstOverlay, secondOverlay );
		plugin.overlayInfo.set( firstOverlay, {
			tileInfo: new Map( [[ tile, {
				meshInfo: new Map( [[ mesh, { attribute } ]] ),
				target: firstTarget,
			} ]] ),
		} );
		plugin.overlayInfo.set( secondOverlay, {
			tileInfo: new Map( [[ tile, {
				meshInfo: new Map(),
				target: null,
			} ]] ),
		} );

		plugin._updateLayers( tile );

		const params = plugin.meshParams.get( mesh );
		expect( params.layerMaps.value ).toEqual( [ firstTarget, null ] );
		expect( params.layerInfo.value ).toEqual( [ firstOverlay, secondOverlay ] );
		expect( mesh.material.defines.LAYER_COUNT ).toBe( 2 );
		expect( mesh.material.defines.LAYER_1_EXISTS ).toBe( 0 );

		plugin.overlays.length = 0;
		plugin._updateLayers( tile );

		expect( params.layerMaps.value ).toHaveLength( 0 );
		expect( params.layerInfo.value ).toHaveLength( 0 );
		expect( mesh.material.defines.LAYER_COUNT ).toBe( 0 );

	} );

} );
