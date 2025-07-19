// Class for making fetches to Cesium Ion, refreshing the token if needed.
export class CesiumIonAuth {

	constructor( options = {} ) {

		const { apiToken, autoRefreshToken = false } = options;
		this.apiToken = apiToken;
		this.autoRefreshToken = autoRefreshToken;
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
