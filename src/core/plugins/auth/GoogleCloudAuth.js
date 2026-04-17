import { TraversalUtils } from '3d-tiles-renderer/core';

const TILES_MAP_URL = 'https://tile.googleapis.com/v1/createSession';

/**
 * Authentication helper for Google Cloud Maps APIs. Manages session-token creation and
 * renewal for both the Photorealistic 3D Tiles API and the 2D Map Tiles API, injecting
 * the API key and session token into outgoing requests.
 */
export class GoogleCloudAuth {

	get isMapTilesSession() {

		return this.authURL === TILES_MAP_URL;

	}

	/**
	 * @param {Object} [options={}]
	 * @param {string} options.apiToken
	 * @param {{ mapType: string, language: string, region: string }|null} [options.sessionOptions=null]
	 * @param {boolean} [options.autoRefreshToken=false]
	 */
	constructor( options = {} ) {

		const { apiToken, sessionOptions = null, autoRefreshToken = false } = options;
		/**
		 * The Google Cloud API key.
		 * @type {string}
		 */
		this.apiToken = apiToken;
		/**
		 * Whether to automatically refresh the session token on 4xx errors.
		 * @type {boolean}
		 */
		this.autoRefreshToken = autoRefreshToken;
		/**
		 * The endpoint URL used to create or refresh the session token.
		 * @type {string}
		 */
		this.authURL = TILES_MAP_URL;
		/**
		 * The current session token, or null if not yet established.
		 * @type {string|null}
		 */
		this.sessionToken = null;
		/**
		 * Session options passed as the POST body when creating a Map Tiles session.
		 * @type {{ mapType: string, language: string, region: string }|null}
		 */
		this.sessionOptions = sessionOptions;
		this._tokenRefreshPromise = null;

	}

	async fetch( url, options ) {

		// if we're using a map tiles session then we have to refresh the token separately
		if ( this.sessionToken === null && this.isMapTilesSession ) {

			this.refreshToken( options );

		}

		await this._tokenRefreshPromise;

		// construct the url
		const fetchUrl = new URL( url );
		fetchUrl.searchParams.set( 'key', this.apiToken );
		if ( this.sessionToken ) {

			fetchUrl.searchParams.set( 'session', this.sessionToken );

		}

		// try to refresh the session token if we failed to load it
		let res = await fetch( fetchUrl, options );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			// refresh the session token
			await this.refreshToken( options );
			if ( this.sessionToken ) {

				fetchUrl.searchParams.set( 'session', this.sessionToken );

			}

			res = await fetch( fetchUrl, options );

		}

		if ( this.sessionToken === null && ! this.isMapTilesSession ) {

			// if we're using a 3d tiles session then we get the session key in the first request
			return res
				.json()
				.then( json => {

					this.sessionToken = getSessionToken( json );
					return json;

				} );

		} else {

			return res;

		}

	}

	refreshToken( options ) {

		if ( this._tokenRefreshPromise === null ) {

			// construct the url to fetch the endpoint
			const url = new URL( this.authURL );
			url.searchParams.set( 'key', this.apiToken );

			// initialize options for map tiles
			const fetchOptions = { ...options };
			if ( this.isMapTilesSession ) {

				fetchOptions.method = 'POST';
				fetchOptions.body = JSON.stringify( this.sessionOptions );
				fetchOptions.headers = fetchOptions.headers || {};
				fetchOptions.headers = {
					...fetchOptions.headers,
					'Content-Type': 'application/json',
				};

			}

			this._tokenRefreshPromise = fetch( url, fetchOptions )
				.then( res => {

					if ( ! res.ok ) {

						throw new Error( `GoogleCloudAuth: Failed to load data with error code ${ res.status }` );

					}

					return res.json();

				} )
				.then( json => {

					this.sessionToken = getSessionToken( json );
					this._tokenRefreshPromise = null;

					return json;

				} );

		}

		return this._tokenRefreshPromise;

	}

}

// Takes a json response from the auth url and extracts the session token
function getSessionToken( json ) {

	if ( 'session' in json ) {

		// if using the 2d maps api
		return json.session;

	} else {

		// is using the 3d tiles api
		let sessionToken = null;
		const root = json.root;
		TraversalUtils.traverseSet( root, tile => {

			if ( tile.content && tile.content.uri ) {

				const [ , params ] = tile.content.uri.split( '?' );
				sessionToken = new URLSearchParams( params ).get( 'session' );
				return true;

			}

			return false;

		} );

		return sessionToken;

	}

}

