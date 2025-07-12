import { traverseSet } from '../../renderer/tiles/traverseFunctions.js';

const TILES_MAP_URL = 'https://tile.googleapis.com/v1/createSession';

// Class for making fetches to Google Cloud, refreshing the token if needed.
// Supports both the 2d map tiles API in addition to 3d tiles.
export class GoogleCloudAuth {

	get isMapTilesSession() {

		return this.authURL === TILES_MAP_URL;

	}

	constructor( options = {} ) {

		const { apiToken, sessionOptions = null, autoRefreshToken = false } = options;
		this.apiToken = apiToken;
		this.autoRefreshToken = autoRefreshToken;
		this.authURL = TILES_MAP_URL;
		this.sessionToken = null;
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
		fetchUrl.searchParams.append( 'key', this.apiToken );
		if ( this.sessionToken ) {

			fetchUrl.searchParams.append( 'session', this.sessionToken );

		}

		// try to refresh the token if we failed ot render
		let res = await fetch( fetchUrl, options );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			await this.refreshToken( options );
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
			url.searchParams.append( 'key', this.apiToken );

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
		traverseSet( root, tile => {

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

