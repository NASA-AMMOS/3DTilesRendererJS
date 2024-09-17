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
		this._loadPromise = null;
		this._tokenRefreshPromise = null;
		this._endpointURL = null;
		this._deferredToPlugin = false;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	loadRootTileSet( rootUrl ) {

		if ( this._tokenState === UNLOADED ) {

			this._tokenState = LOADING;

			// construct the url to fetch the endpoint
			let url;
			if ( this.assetId === null ) {

				url = new URL( rootUrl );

			} else {

				url = new URL( `https://api.cesium.com/v1/assets/${ this.assetId }/endpoint` );

			}

			this._endpointURL = url.toString();

			url.searchParams.append( 'access_token', this.apiToken );

			// load the ion asset information
			this._loadPromise = fetch( url, { mode: 'cors' } )
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

						const url = new URL( json.url );
						tiles.rootURL = json.url;

						// save the version key if present
						if ( url.searchParams.has( 'v' ) ) {

							this._tileSetVersion = url.searchParams.get( 'v' );
							tiles.fetchOptions.headers = tiles.fetchOptions.headers || {};
							tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;

						}

					}

					this._loadPromise = null;

					return tiles.loadRootTileSet( tiles.rootURL );

				} ).catch( err => {

					this._tokenState = FAILED;
					return Promise.reject( err );

				} );

		}

		return this._loadPromise;

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

							this.tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;
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
