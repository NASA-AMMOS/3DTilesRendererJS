import { GoogleCloudAuth } from '3d-tiles-renderer/core/plugins';
import { GoogleAttributionsManager } from './GoogleAttributionsManager.js';

const TILES_3D_API = 'https://tile.googleapis.com/v1/3dtiles/root.json';

/**
 * @classdesc
 * Plugin for authenticating requests to the Google Cloud Maps APIs, including the
 * Photorealistic 3D Tiles and 2D Map Tiles APIs. Handles session-token management,
 * per-tile attribution collection, and optional logo attribution.
 */
export class GoogleCloudAuthPlugin {

	/**
	 * @param {Object} options
	 * @param {string} options.apiToken
	 * @param {Object|null} [options.sessionOptions=null]
	 * @param {boolean} [options.autoRefreshToken=false]
	 * @param {string|null} [options.logoUrl=null]
	 * @param {boolean} [options.useRecommendedSettings=true]
	 */
	constructor( {
		apiToken,
		sessionOptions = null,
		autoRefreshToken = false,
		logoUrl = null,
		useRecommendedSettings = true,
	} ) {

		this.name = 'GOOGLE_CLOUD_AUTH_PLUGIN';

		/**
		 * The Google Cloud API key.
		 * @type {string}
		 */
		this.apiToken = apiToken;
		/**
		 * Whether to apply recommended renderer settings for photorealistic tiles.
		 * @type {boolean}
		 */
		this.useRecommendedSettings = useRecommendedSettings;
		/**
		 * URL of a logo image to include in attribution output, or null if not set.
		 * @type {string|null}
		 */
		this.logoUrl = logoUrl;

		this.auth = new GoogleCloudAuth( { apiToken, autoRefreshToken, sessionOptions } );
		/**
		 * The TilesRenderer instance this plugin is registered with.
		 * @type {Object|null}
		 */
		this.tiles = null;

		this._visibilityChangeCallback = null;
		this._attributionsManager = new GoogleAttributionsManager();
		this._logoAttribution = {
			value: '',
			type: 'image',
			collapsible: false,
		};
		this._attribution = {
			value: '',
			type: 'string',
			collapsible: true,
		};

	}

	init( tiles ) {

		const { useRecommendedSettings, auth } = this;

		// reset the tiles in case this plugin was removed and re-added
		tiles.resetFailedTiles();

		if ( tiles.rootURL == null ) {

			tiles.rootURL = TILES_3D_API;

		}

		if ( ! auth.sessionOptions ) {

			auth.authURL = tiles.rootURL;

		}

		if ( useRecommendedSettings && ! auth.isMapTilesSession ) {

			// This plugin changes below values to be more efficient for the photorealistic tiles
			tiles.errorTarget = 20;

		}

		this.tiles = tiles;

		this._visibilityChangeCallback = ( { tile, visible } ) => {

			const copyright = tile.engineData.metadata?.asset?.copyright || '';
			if ( visible ) {

				this._attributionsManager.addAttributions( copyright );

			} else {

				this._attributionsManager.removeAttributions( copyright );

			}

		};

		tiles.addEventListener( 'tile-visibility-change', this._visibilityChangeCallback );

	}

	getAttributions( target ) {

		if ( this.tiles.visibleTiles.size > 0 ) {

			if ( this.logoUrl ) {

				this._logoAttribution.value = this.logoUrl;
				target.push( this._logoAttribution );

			}

			this._attribution.value = this._attributionsManager.toString();
			target.push( this._attribution );

		}

	}

	dispose() {

		this.tiles.removeEventListener( 'tile-visibility-change', this._visibilityChangeCallback );

	}

	async fetchData( uri, options ) {

		return this.auth.fetch( uri, options );

	}

}
