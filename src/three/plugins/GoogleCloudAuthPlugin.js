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

			// find the session id in the first sub tile set
			tiles.traverse( tile => {

				if ( tile.content && tile.content.uri ) {

					this.sessionToken = new URL( tile.content.uri, tile.__basePath ).searchParams.get( 'session' );
					return true;

				}

				return false;

			} );

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

}
