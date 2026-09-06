import { Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { ImageOverlayPlugin } from '../../src/plugins.js';
import { WGS84_ELLIPSOID } from '../../src/three/renderer/math/GeoConstants.js';

// Builds the minimal structures needed to exercise the tile splitting logic
// without a renderer: a plugin with one stub overlay that always wants to
// split, and a loaded tile scene containing a single 100 x 100 m quad.
function createSplitFixture() {

	const plugin = new ImageOverlayPlugin( { resolution: 256 } );
	plugin.tiles = {
		ellipsoid: WGS84_ELLIPSOID,
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
