import { CesiumIonAuth } from '../../core/plugins/auth/CesiumIonAuth.js';
import { GoogleCloudAuthPlugin } from './GoogleCloudAuthPlugin.js';
import { TMSTilesPlugin } from './images/EPSGTilesPlugin.js';
import { QuantizedMeshPlugin } from './QuantizedMeshPlugin.js';

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

	constructor( { apiToken, assetId = null, autoRefreshToken = false, useRecommendedSettings = true } ) {

		this.name = 'CESIUM_ION_AUTH_PLUGIN';
		this.auth = new CesiumIonAuth( { apiToken, autoRefreshToken } );

		this.assetId = assetId;
		this.autoRefreshToken = autoRefreshToken;
		this.useRecommendedSettings = useRecommendedSettings;
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

	loadRootTileSet() {

		// ensure we have an up-to-date token and root url, then trigger the internal
		// root tile set load function
		return this
			.auth
			.refreshToken()
			.then( json => {

				this._initializeFromAsset( json );
				return this.tiles.invokeOnePlugin( plugin => plugin !== this && plugin.loadRootTileSet && plugin.loadRootTileSet() );

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

			// if the tile set is "external" then assume it's a google API tile set
			tiles.registerPlugin( new GoogleCloudAuthPlugin( {
				apiToken: url.searchParams.get( 'key' ),
				autoRefreshToken: this.autoRefreshToken,
				useRecommendedSettings: this.useRecommendedSettings,
			} ) );

		} else {

			// GLTF
			// CZML
			// KML
			// GEOJSON
			if ( json.type === 'TERRAIN' && tiles.getPluginByName( 'QUANTIZED_MESH_PLUGIN' ) === null ) {

				tiles.registerPlugin( new QuantizedMeshPlugin( {
					useRecommendedSettings: this.useRecommendedSettings,
				} ) );

			} else if ( json.type === 'IMAGERY' && tiles.getPluginByName( 'TMS_TILES_PLUGIN' ) === null ) {

				tiles.registerPlugin( new TMSTilesPlugin( {
					useRecommendedSettings: this.useRecommendedSettings,
					shape: 'ellipsoid',
				} ) );

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
