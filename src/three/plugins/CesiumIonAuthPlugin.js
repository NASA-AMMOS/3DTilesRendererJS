import { GoogleCloudAuthPlugin } from './GoogleCloudAuthPlugin.js';

const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;

export class CesiumIonAuthPlugin {

	constructor( { apiToken, assetId = null, autoRefreshToken = false } ) {

		this.name = 'CESIUM_ION_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.assetId = assetId;
		this.autoRefreshToken = autoRefreshToken;
		this.tiles = null;
		this._tileSetVersion = - 1;
		this._tokenState = UNLOADED;
		this._rootEndpointPromise = null;
		this._tokenRefreshPromise = null;
		this._endpointURL = null;
		this._deferredToPlugin = false;

	}

	init( tiles ) {

		if ( this.assetId !== null ) {

			tiles.rootURL = `https://api.cesium.com/v1/assets/${ this.assetId }/endpoint`;

		}

		this.tiles = tiles;
		this._endpointURL = tiles.rootURL;

	}

	loadRootTileSet( rootUrl ) {

		// TODO: see if we can get rid of this "load root tile set" function
		if ( this._tokenState === UNLOADED ) {

			this._tokenState = LOADING;

			// construct the url to fetch the endpoint
			const url = new URL( rootUrl );
			url.searchParams.append( 'access_token', this.apiToken );

			// load the ion asset information
			this._rootEndpointPromise = fetch( url, { mode: 'cors' } )
				.then( res => {

					if ( res.ok ) {

						return res.json();

					} else {

						return Promise.reject( new Error( `${ res.status } : ${ res.statusText }` ) );

					}

				} ).then( json => {

					this._tokenState = LOADED;

					const tiles = this.tiles;
					if ( 'externalType' in json ) {

						const url = new URL( json.options.url );
						tiles.rootURL = json.options.url;

						// if the tile set is "external" then assume it's a google API tile set
						tiles.registerPlugin( new GoogleCloudAuthPlugin( { apiToken: url.searchParams.get( 'key' ) } ) );
						this._deferredToPlugin = true;

					} else {

						tiles.rootURL = json.url;
						tiles.fetchOptions.headers = tiles.fetchOptions.headers || {};
						tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;

						// save the version key if present
						const url = new URL( json.url );
						if ( url.searchParams.has( 'v' ) ) {

							this._tileSetVersion = url.searchParams.get( 'v' );

						}

					}

					return tiles.loadRootTileSet( tiles.rootURL );

				} ).catch( err => {

					this._tokenState = FAILED;
					return Promise.reject( err );

				} );

		}

		return this._rootEndpointPromise;

	}

	preprocessURL( uri ) {

		uri = new URL( uri );
		if ( /^http/.test( uri.protocol ) && this._tileSetVersion != - 1 ) {

			uri.searchParams.append( 'v', this._tileSetVersion );

		}
		return uri.toString();

	}

	fetchData( uri, options ) {

		if ( this._deferredToPlugin === true ) {

			return null;

		} else {

			return Promise.resolve().then( async () => {

				// wait for the token to refresh if loading
				if ( this._tokenRefreshPromise !== null ) {

					await this._tokenRefreshPromise;

				}

				const res = await fetch( uri, options );
				if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

					// refetch the root if the token has expired
					const rootURL = new URL( this._endpointURL );
					rootURL.searchParams.append( 'access_token', this.apiToken );
					this._tokenRefreshPromise = await fetch( rootURL, options )
						.then( res => res.json() )
						.then( json => {

							const tiles = this.tiles;
							tiles.fetchOptions.headers = tiles.fetchOptions.headers || {};
							tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;

							this._tokenRefreshPromise = null;

						} );

					return fetch( this.preprocessURL( uri ), options );

				} else {

					return res;

				}

			} );

		}

	}

}
