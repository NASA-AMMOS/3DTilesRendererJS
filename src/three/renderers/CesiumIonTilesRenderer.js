import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';

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
		this._tileSetVersion = - 1;
		this.preprocessURL = uri => {

			uri = new URL( uri );
			if ( /^http/.test( uri.protocol ) && this._tileSetVersion != - 1 ) {

				uri.searchParams.append( 'v', this._tileSetVersion );

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

			fetch( url, { mode: 'cors' } ).then( res => {

				if ( res.ok ) {

					return res.json();

				} else {

					return Promise.reject( `${ res.status } : ${ res.statusText }` );

				}

			} ).then( json => {

				this._tokenState = LOADED;

				// retrieve the url version
				const url = new URL( json.url );
				this._tileSetVersion = url.searchParams.get( 'v' );
				this.rootURL = url;
				this.fetchOptions.headers = this.fetchOptions.headers || {};
				this.fetchOptions.headers.Authorization = `Bearer ${ json.accessToken }`;
				// Actually load the tileset now that we got its url from the cesium ion server
				super.update();

			} ).catch( () => {

				this._tokenState = FAILED;

			} );

		} else if ( state === LOADED ) {

			super.update();

		}

	}

};

export const CesiumIonTilesRenderer = CesiumIonTilesRendererMixin( TilesRenderer );
export const DebugCesiumIonTilesRenderer = CesiumIonTilesRendererMixin( DebugTilesRenderer );


