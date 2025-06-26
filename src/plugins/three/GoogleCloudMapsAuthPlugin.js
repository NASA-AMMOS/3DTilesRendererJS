import { GoogleCloudAuth } from '../base/auth/GoogleCloudAuth.js';
import { GoogleCloudAuthPlugin } from './GoogleCloudAuthPlugin.js';

export class GoogleCloudMapsAuthPlugin {

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

	constructor( { apiToken, sessionOptions, autoRefreshToken = false, useRecommendedSettings = true } ) {

		this.name = 'GOOGLE_MAPS_AUTH_PLUGIN';
		this.priority = - Infinity;
		this.auth = new GoogleCloudAuth( { apiToken, autoRefreshToken, sessionOptions } );

		this.useRecommendedSettings = useRecommendedSettings;
		this.tiles = null;

	}

	init( tiles ) {

		this.tiles = tiles;

		// reset the tiles in case this plugin was removed and re-added
		tiles.resetFailedTiles();

	}


	fetchData( uri, options ) {

		return this.auth.fetch( uri, options );

	}

	getAttributions( target ) {

	}

}
