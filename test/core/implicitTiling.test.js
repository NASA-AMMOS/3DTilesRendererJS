import { TilesRendererBase } from '../../src/core/renderer';
import { ImplicitTilingPlugin } from '../../src/core/plugins';

// Two level quadtree tilesets from the CesiumJS spec data with every tile available. They are
// identical apart from the subtree format, one binary and one json.
const CESIUM_URL = 'https://raw.githubusercontent.com/CesiumGS/cesium/2aaf1daa6b9be58fb087fdc9f05f2f4d7ee37a87/Specs/Data/Cesium3DTiles/Implicit/';
const CONTENT_PATHS = [
	'content/0/0/0.b3dm',
	'content/1/0/0.b3dm',
	'content/1/0/1.b3dm',
	'content/1/1/0.b3dm',
	'content/1/1/1.b3dm',
];

// A six level quadtree from the 3D Tiles samples split across a root subtree and eight child
// subtrees, with content only on the deepest level.
const SPARSE_QUADTREE_URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/a30bfdf2d6cc55f4c3078e8aea3a793af6ebfd56/1.1/SparseImplicitQuadtree/';

// refines every tile so the whole implicit tree is expanded
class RefineAllPlugin {

	calculateTileViewError( tile, target ) {

		target.inView = true;
		target.error = Infinity;
		target.distance = 0;
		return true;

	}

}

function wait() {

	return new Promise( resolve => setTimeout( resolve, 20 ) );

}

// loads the tileset and returns the subtree and content files the renderer requested
async function loadTileset( url, tilesetFile, contentCount ) {

	// tileset paths are resolved against the page location
	vi.stubGlobal( 'window', { location: { href: url } } );

	// content is served empty since only the tile hierarchy is under test
	const subtrees = [];
	const content = [];
	const realFetch = globalThis.fetch;
	vi.stubGlobal( 'fetch', ( requestUrl, options ) => {

		const path = requestUrl.slice( url.length );
		if ( path.startsWith( 'content/' ) ) {

			content.push( path );
			return Promise.resolve( new Response( new ArrayBuffer( 0 ) ) );

		}

		if ( path.startsWith( 'subtrees/' ) ) {

			subtrees.push( path );

		}

		return realFetch( requestUrl, options );

	} );

	const tiles = new TilesRendererBase( url + tilesetFile );
	tiles.registerPlugin( new ImplicitTilingPlugin() );
	tiles.registerPlugin( new RefineAllPlugin() );

	// update until every content tile has been requested, then a few more times to catch extras
	const deadline = performance.now() + 10000;
	while ( content.length < contentCount && performance.now() < deadline ) {

		tiles.update();
		await wait();

	}

	for ( let i = 0; i < 5; i ++ ) {

		tiles.update();
		await wait();

	}

	vi.unstubAllGlobals();
	tiles.dispose();

	return { subtrees, content: content.sort() };

}

describe( 'ImplicitTilingPlugin', () => {

	it( 'should load the content tiles of a binary subtree.', async () => {

		const { content } = await loadTileset( CESIUM_URL + 'ImplicitTileset/', 'tileset_1.1.json', CONTENT_PATHS.length );
		expect( content ).toEqual( CONTENT_PATHS );

	}, 20000 );

	it( 'should load the content tiles of a json subtree.', async () => {

		const { content } = await loadTileset( CESIUM_URL + 'ImplicitTilesetWithJsonSubtree/', 'tileset_1.1.json', CONTENT_PATHS.length );
		expect( content ).toEqual( CONTENT_PATHS );

	}, 20000 );

	it( 'should load the content tiles of child subtrees.', async () => {

		const { subtrees, content } = await loadTileset( SPARSE_QUADTREE_URL, 'tileset.json', 32 );
		expect( subtrees ).toHaveLength( 9 );
		expect( new Set( content ).size ).toBe( 32 );

	}, 20000 );

} );
