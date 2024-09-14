import { traverseSet } from '../../base/traverseFunctions.js';

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

	constructor( { apiToken } ) {

		this.name = 'GOOGLE_CLOUD_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.sessionToken = null;
		this.tiles = null;

		this._onLoadCallback = null;
		this._visibilityChangeCallback = null;

	}

	init( tiles ) {

		this.tiles = tiles;
		this._onLoadCallback = () => {

			this.sessionToken = getSessionToken( tiles.root );

			// clear the callback once the root is loaded
			tiles.removeEventListener( 'load-tile-set', this._onLoadCallback );

		};

		tiles.addEventListener( 'load-tile-set', this._onLoadCallback );

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

		this.tiles.removeEventListener( 'load-tile-set', this._onLoadCallback );

	}

	async fetchData( uri, options ) {

		const res = await fetch( uri, options );
		if ( res.status >= 400 && res.status <= 499 ) {

			// refetch the root if the token has expired
			const rootURL = new URL( this.tiles.rootURL );
			rootURL.searchParams.append( 'key', this.apiToken );
			await fetch( rootURL, options )
				.then( res => res.json() )
				.then( res => {

					this.sessionToken = getSessionToken( res.root );

				} );

			return fetch( this.preprocessURL( uri ), options );

		} else {

			return res;

		}

	}

}
