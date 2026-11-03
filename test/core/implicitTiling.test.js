import { TilesRendererBase } from '../../src/core/renderer';
import { ImplicitTilingPlugin } from '../../src/core/plugins';

// Two level quadtree tilesets from the CesiumJS spec data with every tile available. They are
// identical apart from the subtree format, one binary and one json.
const BASE_URL = 'https://raw.githubusercontent.com/CesiumGS/cesium/2aaf1daa6b9be58fb087fdc9f05f2f4d7ee37a87/Specs/Data/Cesium3DTiles/Implicit/';
const CONTENT_PATHS = [
	'content/0/0/0.b3dm',
	'content/1/0/0.b3dm',
	'content/1/0/1.b3dm',
	'content/1/1/0.b3dm',
	'content/1/1/1.b3dm',
];

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

// loads the tileset and returns the content files the renderer requested
async function loadContentPaths( name ) {

	const tilesetUrl = `${ BASE_URL }${ name }/`;

	// tileset paths are resolved against the page location
	vi.stubGlobal( 'window', { location: { href: tilesetUrl } } );

	// content is served empty since only the tile hierarchy is under test
	const requested = [];
	const realFetch = globalThis.fetch;
	vi.stubGlobal( 'fetch', ( url, options ) => {

		if ( url.endsWith( '.b3dm' ) ) {

			requested.push( url.slice( tilesetUrl.length ) );
			return Promise.resolve( new Response( new ArrayBuffer( 0 ) ) );

		}

		return realFetch( url, options );

	} );

	const tiles = new TilesRendererBase( `${ tilesetUrl }tileset_1.1.json` );
	tiles.registerPlugin( new ImplicitTilingPlugin() );
	tiles.registerPlugin( new RefineAllPlugin() );

	// update until every content tile has been requested, then a few more times to catch extras
	const deadline = performance.now() + 10000;
	while ( requested.length < CONTENT_PATHS.length && performance.now() < deadline ) {

		tiles.update();
		await wait();

	}

	for ( let i = 0; i < 5; i ++ ) {

		tiles.update();
		await wait();

	}

	vi.unstubAllGlobals();
	tiles.dispose();

	return requested.sort();

}

describe( 'ImplicitTilingPlugin', () => {

	it( 'should load the content tiles of a binary subtree.', async () => {

		expect( await loadContentPaths( 'ImplicitTileset' ) ).toEqual( CONTENT_PATHS );

	}, 20000 );

	it( 'should load the content tiles of a json subtree.', async () => {

		expect( await loadContentPaths( 'ImplicitTilesetWithJsonSubtree' ) ).toEqual( CONTENT_PATHS );

	}, 20000 );

} );
