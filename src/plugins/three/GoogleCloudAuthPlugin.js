import { traverseSet } from '../../base/traverseFunctions.js';
import { GoogleAttributionsManager } from './GoogleAttributionsManager.js';

function getSessionToken( root ) {

	let sessionToken = null;
	traverseSet( root, tile => {

		if ( tile.content && tile.content.uri ) {

			const [ , params ] = tile.content.uri.split( '?' );
			sessionToken = new URLSearchParams( params ).get( 'session' );
			return true;

		}

		return false;

	} );

	return sessionToken;

}

export class GoogleCloudAuthPlugin {

	constructor( { apiToken, autoRefreshToken = false, logoUrl = null, useRecommendedSettings = true } ) {

		this.name = 'GOOGLE_CLOUD_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.autoRefreshToken = autoRefreshToken;
		this.useRecommendedSettings = useRecommendedSettings;
		this.logoUrl = logoUrl;
		this.sessionToken = null;
		this.tiles = null;

		this._onLoadCallback = null;
		this._visibilityChangeCallback = null;
		this._tokenRefreshPromise = null;
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

		if ( tiles == null ) {

			return;

		}

		if ( tiles.rootURL == null ) {

			tiles.rootURL = 'https://tile.googleapis.com/v1/3dtiles/root.json';

		}

		if ( this.useRecommendedSettings ) {

			// This plugin changes below values to be more efficient for the photorealistic tiles
			tiles.parseQueue.maxJobs = 10;
			tiles.downloadQueue.maxJobs = 30;
			tiles.errorTarget = 40;

		}

		this.tiles = tiles;
		this._onLoadCallback = ( { tileSet } ) => {

			// the first tile set loaded will be the root
			this.sessionToken = getSessionToken( tileSet.root );

			// clear the callback once the root is loaded
			tiles.removeEventListener( 'load-tile-set', this._onLoadCallback );

		};

		this._visibilityChangeCallback = ( { tile, visible } ) => {

			const copyright = tile.cached.metadata.asset.copyright || '';
			if ( visible ) {

				this._attributionsManager.addAttributions( copyright );

			} else {

				this._attributionsManager.removeAttributions( copyright );

			}

		};

		tiles.addEventListener( 'load-tile-set', this._onLoadCallback );
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

	preprocessURL( uri ) {

		uri = new URL( uri );
		if ( /^http/.test( uri.protocol ) ) {

			uri.searchParams.append( 'key', this.apiToken );
			if ( this.sessionToken !== null ) {

				uri.searchParams.append( 'session', this.sessionToken );

			}

		}
		return uri.toString();

	}

	dispose() {

		const { tiles } = this;
		tiles.removeEventListener( 'load-tile-set', this._onLoadCallback );
		tiles.removeEventListener( 'tile-visibility-change', this._visibilityChangeCallback );

	}

	async fetchData( uri, options ) {

		// wait for the token to refresh if loading
		if ( this._tokenRefreshPromise !== null ) {

			await this._tokenRefreshPromise;
			uri = this.preprocessURL( uri );

		}

		const res = await fetch( uri, options );
		if ( res.status >= 400 && res.status <= 499 && this.autoRefreshToken ) {

			await this._refreshToken( options );
			return fetch( this.preprocessURL( uri ), options );

		} else {

			return res;

		}

	}

	_refreshToken( options ) {

		if ( this._tokenRefreshPromise === null ) {

			// refetch the root if the token has expired
			const rootURL = new URL( this.tiles.rootURL );
			rootURL.searchParams.append( 'key', this.apiToken );
			this._tokenRefreshPromise = fetch( rootURL, options )
				.then( res => res.json() )
				.then( res => {

					this.sessionToken = getSessionToken( res.root );
					this._tokenRefreshPromise = null;

				} );

		}

		return this._tokenRefreshPromise;

	}

}
