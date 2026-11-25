import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { TilesRenderer } from '../../src/index.js';
import { TileCompressionPlugin } from '../../src/plugins.js';

const TILESET_URL = 'https://tiles.example.com/tileset.json';
const BOX_SIZE = 2000;

// A georeferenced root transform with shear, like a tileset in an equal-area map projection:
// the two horizontal axes are not perpendicular (cosine of 2.1e-3 between them), and the frame
// is rotated and placed on the earth surface like an east-north-up frame.
function createShearedTransform() {

	const cosine = 2.1e-3;
	const shear = new Matrix4().set(
		1, cosine, 0, 0,
		0, Math.sqrt( 1 - cosine * cosine ), 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	);

	return new Matrix4()
		.makeRotationAxis( new Vector3( 1, 2, 3 ).normalize(), 0.75 )
		.multiply( shear )
		.setPosition( 4115952.584, 441479.096, 4836404.269 );

}

// Builds a binary glTF file holding one box mesh with only a position attribute.
function createBoxGlb( size ) {

	const geometry = new BoxGeometry( size, size, size );
	const positions = geometry.attributes.position.array;
	const indices = new Uint16Array( geometry.index.array );
	geometry.computeBoundingBox();

	const positionBytes = positions.byteLength;
	const indexBytes = indices.byteLength;
	const binLength = Math.ceil( ( positionBytes + indexBytes ) / 4 ) * 4;
	const bin = new Uint8Array( binLength );
	bin.set( new Uint8Array( positions.buffer, positions.byteOffset, positionBytes ), 0 );
	bin.set( new Uint8Array( indices.buffer ), positionBytes );

	const { min, max } = geometry.boundingBox;
	const json = {
		asset: { version: '2.0' },
		scene: 0,
		scenes: [ { nodes: [ 0 ] } ],
		nodes: [ { mesh: 0 } ],
		meshes: [ { primitives: [ { attributes: { POSITION: 0 }, indices: 1 } ] } ],
		accessors: [
			{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: min.toArray(), max: max.toArray() },
			{ bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
		],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: positionBytes },
			{ buffer: 0, byteOffset: positionBytes, byteLength: indexBytes },
		],
		buffers: [ { byteLength: binLength } ],
	};

	// the JSON chunk is padded with spaces to a 4 byte boundary
	let jsonText = JSON.stringify( json );
	while ( jsonText.length % 4 !== 0 ) {

		jsonText += ' ';

	}

	const jsonBytes = new TextEncoder().encode( jsonText );
	const totalLength = 12 + 8 + jsonBytes.length + 8 + bin.length;
	const glb = new ArrayBuffer( totalLength );
	const view = new DataView( glb );
	const bytes = new Uint8Array( glb );

	view.setUint32( 0, 0x46546C67, true );
	view.setUint32( 4, 2, true );
	view.setUint32( 8, totalLength, true );

	view.setUint32( 12, jsonBytes.length, true );
	view.setUint32( 16, 0x4E4F534A, true );
	bytes.set( jsonBytes, 20 );

	const binOffset = 20 + jsonBytes.length;
	view.setUint32( binOffset, bin.length, true );
	view.setUint32( binOffset + 4, 0x004E4942, true );
	bytes.set( bin, binOffset + 8 );

	return glb;

}

// refines every tile so the root content is loaded and shown without a camera
class RefineAllPlugin {

	calculateTileViewError( tile, target ) {

		target.inView = true;
		target.error = Infinity;
		target.distance = 0;
		return true;

	}

}

// Loads a one tile tileset served from memory and resolves with the tile scene once it is visible.
async function loadShearedTileset( rootTransform, plugins = [] ) {

	const half = BOX_SIZE / 2;
	const tileset = {
		asset: { version: '1.0' },
		geometricError: 100,
		root: {
			transform: rootTransform.toArray(),
			boundingVolume: { box: [ 0, 0, 0, half, 0, 0, 0, half, 0, 0, 0, half ] },
			geometricError: 0,
			refine: 'REPLACE',
			content: { uri: 'box.glb' },
		},
	};
	const glb = createBoxGlb( BOX_SIZE );

	vi.stubGlobal( 'window', { location: { href: TILESET_URL } } );
	vi.stubGlobal( 'fetch', async url => {

		if ( url.endsWith( 'tileset.json' ) ) {

			return new Response( JSON.stringify( tileset ) );

		}

		return new Response( glb.slice( 0 ) );

	} );

	const tiles = new TilesRenderer( TILESET_URL );
	tiles.registerPlugin( new RefineAllPlugin() );
	plugins.forEach( plugin => tiles.registerPlugin( plugin ) );

	const deadline = performance.now() + 5000;
	while ( tiles.group.children.length === 0 && performance.now() < deadline ) {

		tiles.update();
		await new Promise( resolve => setTimeout( resolve, 10 ) );

	}

	vi.unstubAllGlobals();

	return { tiles, scene: tiles.group.children[ 0 ] };

}

// Returns the largest distance between where the box vertices draw and where "expected" puts the
// glTF vertices, relative to the box size.
function maxRelativeVertexError( scene, expected ) {

	const reference = new BoxGeometry( BOX_SIZE, BOX_SIZE, BOX_SIZE ).attributes.position;
	const vertex = new Vector3();
	const target = new Vector3();
	let maxError = 0;

	let mesh = null;
	scene.traverse( c => {

		if ( c.isMesh ) {

			mesh = c;

		}

	} );

	// the compression plugin rewrites the position attribute, so compare against the source box
	const position = mesh.geometry.attributes.position;
	for ( let i = 0; i < reference.count; i ++ ) {

		vertex.fromBufferAttribute( position, i ).applyMatrix4( mesh.matrixWorld );
		target.fromBufferAttribute( reference, i ).applyMatrix4( expected );
		maxError = Math.max( maxError, vertex.distanceTo( target ) / BOX_SIZE );

	}

	return maxError;

}

// the matrix that takes a glTF vertex into the tileset frame: the root transform after the
// y-up to z-up correction of glTF content
function getExpectedTileMatrix( rootTransform ) {

	return rootTransform.clone().multiply( new Matrix4().makeRotationX( Math.PI / 2 ) );

}

describe( 'TilesRenderer tile transforms', () => {

	it( 'keeps the shear of a tile transform when world matrices update', async () => {

		const rootTransform = createShearedTransform();
		const { tiles, scene } = await loadShearedTileset( rootTransform );
		expect( scene ).toBeDefined();

		tiles.group.updateMatrixWorld( true );
		scene.updateMatrixWorld();

		const expected = getExpectedTileMatrix( rootTransform );
		expect( maxRelativeVertexError( scene, expected ) ).toBeLessThan( 1e-6 );

		tiles.dispose();

	} );

	it( 'updates the tile world matrices when the tiles group moves', async () => {

		const rootTransform = createShearedTransform();
		const { tiles, scene } = await loadShearedTileset( rootTransform );
		tiles.group.updateMatrixWorld( true );

		// move the group so that every tile world matrix must follow
		tiles.group.position.set( - 4115952, - 441479, - 4836404 );
		tiles.group.rotation.set( 0.1, 0.2, 0.3 );
		tiles.group.updateMatrixWorld();

		const expected = getExpectedTileMatrix( rootTransform ).premultiply( tiles.group.matrixWorld );
		expect( maxRelativeVertexError( scene, expected ) ).toBeLessThan( 1e-6 );

		tiles.dispose();

	} );

	it( 'keeps the tile transform when the compression plugin recenters the root mesh', () => {

		// a tile scene that is itself a mesh, as produced by the terrain plugins
		const rootTransform = createShearedTransform();
		const scene = new Mesh( new BoxGeometry( BOX_SIZE, BOX_SIZE, BOX_SIZE ).translate( 300, 200, 100 ), new MeshBasicMaterial() );
		scene.matrix.copy( rootTransform );
		scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
		scene.matrixAutoUpdate = false;

		const parent = new Group();
		parent.add( scene );
		parent.updateMatrixWorld( true );

		const plugin = new TileCompressionPlugin( { compressPosition: true, positionType: Int32Array } );
		plugin.processTileModel( scene, {} );
		parent.updateMatrixWorld( true );

		// Int32 quantization of the 2 km box is far finer than the tolerance
		const expected = rootTransform.clone().multiply( new Matrix4().makeTranslation( 300, 200, 100 ) );
		expect( maxRelativeVertexError( scene, expected ) ).toBeLessThan( 1e-6 );

	} );

} );
