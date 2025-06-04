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

		const fetchOptions = { ...options };
		fetchOptions.headers = fetchOptions.headers || {};
		fetchOptions.headers = {
			...fetchOptions.headers,
			Authorization: this._bearerToken,
		};

		const res = await fetch( url, fetchOptions );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			await this.refreshToken( options );
			return fetch( this.preprocessURL( url ), options );

		} else {

			return res;

		}

	}

	dispose() {

		this._disposed = true;

	}

	refreshToken( options ) {

		if ( this._tokenRefreshPromise === null ) {

			// construct the url to fetch the endpoint
			const url = new URL( this.authURL );
			url.searchParams.append( 'access_token', this.apiToken );

			this._tokenRefreshPromise = fetch( url, options )
				.then( res => {

					if ( this._disposed ) {

						return null;

					}

					if ( ! res.ok ) {

						throw new Error( `CesiumIonAuthPlugin: Failed to load data with error code ${ res.status }` );

					}

					return res.json();

				} )
				.then( json => {

					if ( this._disposed ) {

						return null;

					}

					this._bearerToken = `Bearer ${ json.accessToken }`;
					this._tokenRefreshPromise = null;

					return json;

				} );

		}

		return this._tokenRefreshPromise;

	}

}
