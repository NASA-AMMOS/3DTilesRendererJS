/**
 * @classdesc
 * Authentication helper for Cesium Ion. Fetches and caches a bearer token from the
 * Cesium Ion endpoint and injects it into outgoing requests. Supports optional
 * automatic token refresh on 4xx responses.
 */
export class CesiumIonAuth {

	/**
	 * @param {Object} [options={}]
	 * @param {string} options.apiToken - Cesium Ion access token.
	 * @param {boolean} [options.autoRefreshToken=false] - Whether to automatically refresh the token on 4xx errors.
	 */
	constructor( options = {} ) {

		const { apiToken, autoRefreshToken = false } = options;
		/**
		 * The Cesium Ion access token.
		 * @type {string}
		 */
		this.apiToken = apiToken;
		/**
		 * Whether to automatically refresh the token on 4xx errors.
		 * @type {boolean}
		 */
		this.autoRefreshToken = autoRefreshToken;
		/**
		 * The endpoint URL used to fetch the bearer token.
		 * @type {string|null}
		 */
		this.authURL = null;
		this._tokenRefreshPromise = null;
		this._bearerToken = null;

	}

	async fetch( url, options ) {

		await this._tokenRefreshPromise;

		// insert the authorization token
		const fetchOptions = { ...options };
		fetchOptions.headers = fetchOptions.headers || {};
		fetchOptions.headers = {
			...fetchOptions.headers,
			Authorization: this._bearerToken,
		};

		// try to refresh the token if we failed to load the tile data
		const res = await fetch( url, fetchOptions );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			// refresh the bearer token
			await this.refreshToken( options );
			fetchOptions.headers.Authorization = this._bearerToken;

			return fetch( url, fetchOptions );

		} else {

			return res;

		}

	}

	refreshToken( options ) {

		if ( this._tokenRefreshPromise === null ) {

			// construct the url to fetch the endpoint
			const url = new URL( this.authURL );
			url.searchParams.set( 'access_token', this.apiToken );

			this._tokenRefreshPromise = fetch( url, options )
				.then( res => {

					if ( ! res.ok ) {

						throw new Error( `CesiumIonAuthPlugin: Failed to load data with error code ${ res.status }` );

					}

					return res.json();

				} )
				.then( json => {

					this._bearerToken = `Bearer ${ json.accessToken }`;
					this._tokenRefreshPromise = null;

					return json;

				} );

		}

		return this._tokenRefreshPromise;

	}

}
