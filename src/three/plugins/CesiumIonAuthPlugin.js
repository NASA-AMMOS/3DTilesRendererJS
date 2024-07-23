const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;

export class CesiumIonAuthPlugin {

	constructor( { apiToken, assetId } ) {

		this.name = 'CESIUM_ION_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.assetId = assetId;
		this.tiles = null;
		this._tileSetVersion = - 1;
		this._tokenState = UNLOADED;
		this._loadPromise = null;

	}

	loadRootTileSet() {

		if ( this._tokenState === UNLOADED ) {

			this._tokenState = LOADING;

			// construct the url to fetch the endpoint
			const url = new URL( `https://api.cesium.com/v1/assets/${ this.assetId }/endpoint` );
			url.searchParams.append( 'access_token', this.apiToken );

			this._loadPromise = fetch( url, { mode: 'cors' } )
				.then( res => {

					if ( res.ok ) {

						return res.json();

					} else {

						return Promise.reject( `${ res.status } : ${ res.statusText }` );

					}

				} ).then( json => {

					this._tokenState = LOADED;

					// retrieve the url version
					const tiles = this.tiles;
					const url = new URL( json.url );
					this._tileSetVersion = url.searchParams.get( 'v' );
					tiles.rootURL = url;
					tiles.fetchOptions.headers = tiles.fetchOptions.headers || {};
					tiles.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;

					return tiles.loadRootTileSet( tiles.rootURL );

				} ).catch( () => {

					this._tokenState = FAILED;

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

}
