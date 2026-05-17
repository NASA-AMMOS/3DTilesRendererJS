import { readFileSync, statSync, existsSync } from 'fs';
import { ZipArchiveReader } from '../../src/core/plugins/loaders/ZipArchiveReader.js';
import { TZ3Plugin } from '../../src/core/plugins/TZ3Plugin.js';
import { TilesRendererBase } from '../../src/core/renderer/index.js';

const FIXTURE_PATH = '/tmp/TilesetOfTilesets.3tz';

// Serve a local file to the reader by responding to Range requests so we can
// exercise the range-request code path without real HTTP.
function makeFixtureFetch( filePath ) {

	const fileSize = statSync( filePath ).size;
	return async ( _url, init ) => {

		const header = init && init.headers;
		const range = header instanceof Headers ? header.get( 'Range' ) : ( header && header.Range );
		let start = 0;
		let end = fileSize - 1;
		if ( range ) {

			const m = range.match( /bytes=(-?\d+)(?:-(\d+))?/ );
			if ( m ) {

				const a = Number( m[ 1 ] );
				if ( a < 0 ) {

					start = Math.max( 0, fileSize + a );
					end = fileSize - 1;

				} else {

					start = a;
					end = m[ 2 ] ? Math.min( fileSize - 1, Number( m[ 2 ] ) ) : fileSize - 1;

				}

			}

		}

		const length = end - start + 1;
		const fd = readFileSync( filePath ).subarray( start, end + 1 );
		const body = new Uint8Array( fd );
		return new Response( body, {
			status: range ? 206 : 200,
			headers: {
				'Content-Range': `bytes ${ start }-${ end }/${ fileSize }`,
				'Content-Length': String( length ),
			},
		} );

	};

}

const hasFixture = existsSync( FIXTURE_PATH );

describe.skipIf( ! hasFixture )( 'ZipArchiveReader', () => {

	it( 'indexes the central directory from a real 3tz file', async () => {

		const reader = new ZipArchiveReader( FIXTURE_PATH, makeFixtureFetch( FIXTURE_PATH ) );
		await reader.ready();

		expect( reader.entries.has( 'tileset.json' ) ).toBe( true );
		expect( reader.entries.has( '@3dtilesIndex1@' ) ).toBe( true );
		expect( reader.entries.size ).toBeGreaterThan( 1 );

	} );

	it( 'reads tileset.json as valid JSON', async () => {

		const reader = new ZipArchiveReader( FIXTURE_PATH, makeFixtureFetch( FIXTURE_PATH ) );
		const bytes = await reader.getFile( 'tileset.json' );
		const json = JSON.parse( new TextDecoder().decode( bytes ) );

		expect( json.asset ).toBeDefined();
		expect( json.root ).toBeDefined();

	} );

	it( 'reads a binary tile entry at the right length', async () => {

		const reader = new ZipArchiveReader( FIXTURE_PATH, makeFixtureFetch( FIXTURE_PATH ) );
		await reader.ready();

		const picked = [ ...reader.entries.values() ]
			.find( e => e.name !== 'tileset.json' && e.name !== '@3dtilesIndex1@' );

		const bytes = await reader.getFile( picked.name );
		expect( bytes.byteLength ).toBe( picked.uncompSize );

	} );

} );

describe.skipIf( ! hasFixture )( 'TZ3Plugin (end-to-end)', () => {

	function patchPluginFetch( plugin, filePath ) {

		const fixtureFetch = makeFixtureFetch( filePath );
		const origFetch = plugin._fetchFromArchive.bind( plugin );
		plugin._fetchFromArchive = ( archiveUrl, relPath, options ) => {

			// Re-use the plugin's archive cache but route range requests at
			// the archive URL through the fixture fetch.
			const archives = plugin._archives;
			if ( ! archives.has( archiveUrl ) ) {

				archives.set( archiveUrl, new ZipArchiveReader( archiveUrl, fixtureFetch, options || {} ) );

			}

			return origFetch( archiveUrl, relPath, options );

		};

	}

	it( 'loads a root tileset through TilesRendererBase', async () => {

		globalThis.window = { location: { href: 'http://localhost/' } };

		const tiles = new TilesRendererBase();
		tiles.rootURL = 'http://localhost/TilesetOfTilesets.3tz';

		const plugin = new TZ3Plugin();
		patchPluginFetch( plugin, FIXTURE_PATH );
		tiles.registerPlugin( plugin );

		try {

			const root = await tiles.loadRootTileset();
			expect( root.asset ).toBeDefined();
			expect( root.root ).toBeDefined();

		} finally {

			delete globalThis.window;

		}

	} );

} );

describe.skipIf( ! hasFixture )( 'ZipArchiveReader zstd handling', () => {

	it( 'throws a clear error on zstd entries when the runtime lacks DecompressionStream("zstd")', async () => {

		const reader = new ZipArchiveReader( FIXTURE_PATH, makeFixtureFetch( FIXTURE_PATH ) );
		await reader.ready();

		const victim = [ ...reader.entries.values() ]
			.find( e => e.name !== 'tileset.json' && e.name !== '@3dtilesIndex1@' );
		victim.method = 93;

		// Whether the runtime supports zstd or not, feeding the decoder bytes
		// that were stored uncompressed must surface as a rejected promise
		// with a descriptive error — never as a silent miss.
		await expect( reader.getFile( victim.name ) ).rejects.toThrow();

	} );

} );

describe( 'TZ3Plugin', () => {

	it( 'rewrites a root .3tz URL to append /tileset.json', () => {

		const plugin = new TZ3Plugin();
		expect( plugin.preprocessURL( 'https://ex.com/a.3tz', null ) )
			.toBe( 'https://ex.com/a.3tz/tileset.json' );
		expect( plugin.preprocessURL( 'https://ex.com/a.3tz?t=1', null ) )
			.toBe( 'https://ex.com/a.3tz/tileset.json?t=1' );

	} );

	it( 'leaves non-archive URLs alone', () => {

		const plugin = new TZ3Plugin();
		expect( plugin.preprocessURL( 'https://ex.com/tileset.json', null ) )
			.toBe( 'https://ex.com/tileset.json' );

	} );

	it( 'does not rewrite URLs already inside the archive', () => {

		const plugin = new TZ3Plugin();
		expect( plugin.preprocessURL( 'https://ex.com/a.3tz/tileset.json', null ) )
			.toBe( 'https://ex.com/a.3tz/tileset.json' );

	} );

	it( 'ignores fetchData for non-archive URLs', () => {

		const plugin = new TZ3Plugin();
		expect( plugin.fetchData( 'https://ex.com/tileset.json', {} ) ).toBe( null );

	} );

} );
