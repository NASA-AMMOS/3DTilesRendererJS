import { GoogleCloudAuthPlugin } from './GoogleCloudAuthPlugin.js';

export class CesiumIonAuthPlugin {

	constructor( { apiToken, assetId = null, autoRefreshToken = false } ) {

		this.name = 'CESIUM_ION_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.assetId = assetId;
		this.autoRefreshToken = autoRefreshToken;
		this.tiles = null;
		this.endpointURL = null;

		this._bearerToken = null;
		this._tileSetVersion = - 1;
		this._tokenRefreshPromise = null;

	}

	init( tiles ) {

		if ( this.assetId !== null ) {

			tiles.rootURL = `https://api.cesium.com/v1/assets/${ this.assetId }/endpoint`;

		}

		this.tiles = tiles;
		this.endpointURL = tiles.rootURL;

	}

	loadRootTileSet() {

		// ensure we have an up-to-date token and root url, then trigger the internal
		// root tile set load function
		return this._refreshToken()
			.then( () => this.tiles.loadRootTileSet() );

	}

	preprocessURL( uri ) {

		uri = new URL( uri );
		if ( /^http/.test( uri.protocol ) && this._tileSetVersion != - 1 ) {

			uri.searchParams.append( 'v', this._tileSetVersion );

		}
		return uri.toString();

	}

	fetchData( uri, options ) {

		const tiles = this.tiles;
		if ( tiles.getPluginByName( 'GOOGLE_CLOUD_AUTH_PLUGIN' ) !== null ) {

			return null;

		} else {

			return Promise.resolve().then( async () => {

				// wait for the token to refresh if loading
				if ( this._tokenRefreshPromise !== null ) {

					await this._tokenRefreshPromise;

				}

				const res = await fetch( uri, options );
				if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

					await this._refreshToken();
					return fetch( this.preprocessURL( uri ), options );

				} else {

					return res;

				}

			} );

		}

	}

	_refreshToken() {

		if ( this._tokenRefreshPromise === null ) {

			// construct the url to fetch the endpoint
			const url = new URL( this.endpointURL );
			url.searchParams.append( 'access_token', this.apiToken );

			this._tokenRefreshPromise = fetch( url, { mode: 'cors' } )
				.then( res => res.json() )
				.then( json => {

					const tiles = this.tiles;
					if ( 'externalType' in json ) {

						const url = new URL( json.options.url );
						tiles.rootURL = json.options.url;

						// if the tile set is "external" then assume it's a google API tile set
						tiles.registerPlugin( new GoogleCloudAuthPlugin( { apiToken: url.searchParams.get( 'key' ) } ) );

					} else {


						tiles.rootURL = json.url;
						tiles.fetchOptions.headers = tiles.fetchOptions.headers || {};
						tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;

						// save the version key if present
						const url = new URL( json.url );
						if ( url.searchParams.has( 'v' ) && this._tileSetVersion === - 1 ) {

							this._tileSetVersion = url.searchParams.get( 'v' );

						}

						this._bearerToken = json.accessToken;

					}

					this._tokenRefreshPromise = null;

					return json;

				} );

		}

		return this._tokenRefreshPromise;

	}

}
