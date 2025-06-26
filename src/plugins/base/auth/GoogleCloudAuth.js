// Class for making fetches to Cesium Ion, refreshing the token if needed.
export class GoogleCloudAuth {

	constructor( options = {} ) {

		const { apiToken, sessionOptions, autoRefreshToken = false } = options;
		this.apiToken = apiToken;
		this.autoRefreshToken = autoRefreshToken;
		this.authURL = 'https://tile.googleapis.com/v1/createSession';
		this.sessionToken = null;
		this.sessionOptions = sessionOptions;
		this._tokenRefreshPromise = null;

	}

	async fetch( url, options ) {

		if ( this.sessionToken === null ) {

			this.refreshToken( options );

		}

		await this._tokenRefreshPromise;

		const fetchUrl = new URL( url );
		fetchUrl.searchParams.append( 'key', this.apiToken );
		fetchUrl.searchParams.append( 'session', this.sessionToken );

		// try to refresh the token if we failed ot render
		const res = await fetch( fetchUrl, options );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			await this.refreshToken( options );
			return fetch( fetchUrl, options );

		} else {

			return res;

		}

	}

	refreshToken( options ) {

		if ( this._tokenRefreshPromise === null ) {

			// construct the url to fetch the endpoint
			const url = new URL( this.authURL );
			url.searchParams.append( 'key', this.apiToken );

			const fetchOptions = {
				...options,
				method: 'POST',
				body: JSON.stringify( this.sessionOptions ),
			};
			fetchOptions.headers = fetchOptions.headers || {};
			fetchOptions.headers = {
				...fetchOptions.headers,
				'Content-Type': 'application/json',
			};

			this._tokenRefreshPromise = fetch( url, fetchOptions )
				.then( res => {

					if ( ! res.ok ) {

						throw new Error( `CesiumIonAuthPlugin: Failed to load data with error code ${ res.status }` );

					}

					return res.json();

				} )
				.then( json => {

					this.sessionToken = json.session;
					this._tokenRefreshPromise = null;

					return json;

				} );

		}

		return this._tokenRefreshPromise;

	}

}
