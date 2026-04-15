/** @import { TilesRendererBase } from '3d-tiles-renderer/core' */
import { CesiumIonAuth } from './auth/CesiumIonAuth.js';
import { GoogleCloudAuthPlugin } from './GoogleCloudAuthPlugin.js';

/**
 * @callback AssetTypeHandlerCallback
 * @param {string} type - The Cesium Ion asset type (e.g. `'TERRAIN'`, `'GLTF'`, `'CZML'`).
 * @param {TilesRendererBase} tiles - The tiles renderer instance.
 * @param {Object} asset - The full asset endpoint JSON response.
 */

/**
 * Plugin for authenticating requests to Cesium Ion. Handles token refresh, asset endpoint
 * resolution, and attribution collection. Automatically registers a GoogleCloudAuthPlugin
 * when the resolved asset is an external Google photorealistic tileset.
 */
export class CesiumIonAuthPlugin {

	get apiToken() {

		return this.auth.apiToken;

	}

	set apiToken( v ) {

		this.auth.apiToken = v;

	}

	get autoRefreshToken() {

		return this.auth.autoRefreshToken;

	}

	set autoRefreshToken( v ) {

		this.auth.autoRefreshToken = v;

	}

	/**
	 * @param {Object} options
	 * @param {string} options.apiToken
	 * @param {number|null} [options.assetId=null]
	 * @param {boolean} [options.autoRefreshToken=false]
	 * @param {boolean} [options.useRecommendedSettings=true]
	 * @param {AssetTypeHandlerCallback} [options.assetTypeHandler]
	 */
	constructor( options = {} ) {

		const {
			apiToken,
			assetId = null,
			autoRefreshToken = false,
			useRecommendedSettings = true,
			assetTypeHandler = ( type, tiles, asset ) => {

				console.warn( `CesiumIonAuthPlugin: Cesium Ion asset type "${ type }" unhandled.` );

			},
		} = options;

		this.name = 'CESIUM_ION_AUTH_PLUGIN';
		this.auth = new CesiumIonAuth( { apiToken, autoRefreshToken } );

		/**
		 * The Cesium Ion asset ID to load, or null if using an explicit root URL.
		 * @type {number|null}
		 */
		this.assetId = assetId;
		/**
		 * Whether to automatically refresh the token on 4xx errors.
		 * @type {boolean}
		 */
		this.autoRefreshToken = autoRefreshToken;
		/**
		 * Whether to apply recommended renderer settings for Cesium Ion assets.
		 * @type {boolean}
		 */
		this.useRecommendedSettings = useRecommendedSettings;
		/**
		 * Callback invoked when the resolved Cesium Ion asset type is not `3DTILES`.
		 * @type {AssetTypeHandlerCallback}
		 */
		this.assetTypeHandler = assetTypeHandler;
		/**
		 * The TilesRenderer instance this plugin is registered with.
		 * @type {Object|null}
		 */
		this.tiles = null;

		this._tileSetVersion = - 1;
		this._attributions = [];

	}

	init( tiles ) {

		if ( this.assetId !== null ) {

			tiles.rootURL = `https://api.cesium.com/v1/assets/${ this.assetId }/endpoint`;

		}

		this.tiles = tiles;
		this.auth.authURL = tiles.rootURL;

		// reset the tiles in case this plugin was removed and re-added
		tiles.resetFailedTiles();

	}

	loadRootTileset() {

		// ensure we have an up-to-date token and root url, then trigger the internal
		// root tileset load function
		return this
			.auth
			.refreshToken()
			.then( json => {

				this._initializeFromAsset( json );
				return this.tiles.invokeOnePlugin( plugin => plugin !== this && plugin.loadRootTileset && plugin.loadRootTileset() );

			} )
			.catch( error => {

				this.tiles.dispatchEvent( {
					type: 'load-error',
					tile: null,
					error,
					url: this.auth.authURL,
				} );

			} );

	}

	preprocessURL( uri ) {

		uri = new URL( uri );
		if ( /^http/.test( uri.protocol ) && this._tileSetVersion != - 1 ) {

			uri.searchParams.set( 'v', this._tileSetVersion );

		}

		return uri.toString();

	}

	fetchData( uri, options ) {

		const tiles = this.tiles;
		if ( tiles.getPluginByName( 'GOOGLE_CLOUD_AUTH_PLUGIN' ) !== null ) {

			return null;

		} else {

			return this.auth.fetch( uri, options );

		}

	}

	getAttributions( target ) {

		if ( this.tiles.visibleTiles.size > 0 ) {

			target.push( ...this._attributions );

		}

	}

	_initializeFromAsset( json ) {

		const tiles = this.tiles;
		if ( 'externalType' in json ) {

			const url = new URL( json.options.url );
			tiles.rootURL = json.options.url;

			// if the tileset is "external" then assume it's a google API tileset
			tiles.registerPlugin( new GoogleCloudAuthPlugin( {
				apiToken: url.searchParams.get( 'key' ),
				autoRefreshToken: this.autoRefreshToken,
				useRecommendedSettings: this.useRecommendedSettings,
			} ) );

		} else {

			// fire callback for unhandled asset types
			if ( json.type !== '3DTILES' ) {

				// Other types include:
				// - GLTF
				// - CZML
				// - KML
				// - GEOJSON
				// - TERRAIN (QuantizedMesh)
				// - IMAGERY (TSM Tiles)

				this.assetTypeHandler( json.type, tiles, json );

			}

			tiles.rootURL = json.url;

			// save the version key if present
			const url = new URL( json.url );
			if ( url.searchParams.has( 'v' ) && this._tileSetVersion === - 1 ) {

				this._tileSetVersion = url.searchParams.get( 'v' );

			}

			if ( json.attributions ) {

				this._attributions = json.attributions.map( att => ( {
					value: att.html,
					type: 'html',
					collapsible: att.collapsible,
				} ) );

			}

		}

	}

}
