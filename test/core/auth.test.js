import { CesiumIonAuth } from '../../src/core/plugins/auth/CesiumIonAuth.js';
import { GoogleCloudAuth } from '../../src/core/plugins/auth/GoogleCloudAuth.js';

describe( 'CesiumIonAuth', () => {

	afterEach( () => {

		vi.unstubAllGlobals();

	} );

	it( 'should only send the bearer token to the resolved tileset host', async () => {

		const calls = [];
		vi.stubGlobal( 'fetch', vi.fn( async ( url, options ) => {

			calls.push( {
				url: url.toString(),
				auth: options?.headers?.Authorization,
			} );

			return {

				ok: true,
				status: 200,
				json: async () => {

					if ( ! /endpoint$/.test( url.pathname ) ) {

						return {};

					} else {

						return {
							accessToken: 'TOKEN',
							url: 'https://tiles.example.com/tileset.json',
						};

					}

				},
			};

		} ) );

		const auth = new CesiumIonAuth( { apiToken: 'KEY' } );
		auth.authURL = 'https://auth.example.com/endpoint';
		await auth.refreshToken();

		// request on the tileset host and an unrelated attacker host
		await auth.fetch( 'https://tiles.example.com/0.b3dm' );
		await auth.fetch( 'https://attacker.example.com/steal.b3dm' );

		const sameHost = calls.find( c => c.url.includes( 'tiles.example.com/0' ) );
		const crossHost = calls.find( c => c.url.includes( 'attacker.example.com' ) );

		expect( sameHost.auth ).toBe( 'Bearer TOKEN' );
		expect( crossHost.auth ).toBeUndefined();

	} );

} );

describe( 'GoogleCloudAuth', () => {

	afterEach( () => {

		vi.unstubAllGlobals();

	} );

	it( 'should only send the api key and session to the auth endpoint host', async () => {

		const calls = [];
		vi.stubGlobal( 'fetch', vi.fn( async url => {

			calls.push( url.toString() );

			return {
				ok: true,
				status: 200,
				json: async () => {

					if ( ! /root\.json$/.test( url.pathname ) ) {

						return {};

					} else {

						return { root: {
							content: { uri: 'tile.glb?session=SESS' },
							children: [],
						} };

					}

				},
			};

		} ) );

		const auth = new GoogleCloudAuth( { apiToken: 'TOKEN' } );
		auth.authURL = 'https://provider.example.com/root.json';

		// make an initial request to the tile set so that the session token is present for subsequent
		// requests - we're not stubbing failed requests tht would typically trigger a refetch.
		await auth.fetch( 'https://provider.example.com/root.json' );
		await auth.fetch( 'https://provider.example.com/1.glb' );
		await auth.fetch( 'https://attacker.example.com/bad.glb' );

		const sameHost = calls.find( c => c.includes( 'provider.example.com/1.glb' ) );
		const crossHost = calls.find( c => c.includes( 'attacker.example.com' ) );

		expect( sameHost ).toContain( 'key=TOKEN' );
		expect( sameHost ).toContain( 'session=SESS' );
		expect( crossHost ).not.toContain( 'key=' );
		expect( crossHost ).not.toContain( 'session=' );

	} );

} );
