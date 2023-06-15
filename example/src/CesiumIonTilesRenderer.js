import { TilesRenderer, DebugTilesRenderer } from '../../src/index.js';

const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;
const CesiumIonTilesRendererMixin = base => class extends base {

	constructor( ionAssetId, ionAccessToken ) {

		super();
		this._tokenState = UNLOADED;
		this._ionAccessToken = ionAccessToken;
		this._ionAssetId = ionAssetId;
		this._tilesetVersion = - 1;

		this.preprocessURL = uri => {

			uri = new URL( uri );
			if ( /^http/.test( uri.protocol ) ) {

				uri.searchParams.append( 'v', this._tilesetVersion );

			}
			return uri.toString();

		};

	}

	update() {

		const state = this._tokenState;
		if ( state === UNLOADED ) {

			this._tokenState = LOADING;

			const url = new URL( `https://api.cesium.com/v1/assets/${ this._ionAssetId }/endpoint` );
			url.searchParams.append( 'access_token', this._ionAccessToken );

			fetch( url, { mode: 'cors' } )
				.then( res => {

					if ( res.ok ) {

						return res.json();

					} else {

						return Promise.reject( `${res.status} : ${res.statusText}` );

					}

				} )
				.then( json => {

					const url = new URL( json.url );
					this._tilesetVersion = url.searchParams.get( 'v' );
					this.rootURL = url;
					if ( ! this.fetchOptions.headers ) {

						this.fetchOptions.headers = {};

					}
					this.fetchOptions.headers.Authorization = `Bearer ${json.accessToken}`;
					this._tokenState = LOADED;

				} )
				.catch( () => {

					this._tokenState = FAILED;

				} );

		} else if( state === LOADED ) {

			super.update();

		}

	}

};

export const CesiumIonTilesRenderer = CesiumIonTilesRendererMixin( TilesRenderer );
export const DebugCesiumIonTilesRenderer = CesiumIonTilesRendererMixin( DebugTilesRenderer );


