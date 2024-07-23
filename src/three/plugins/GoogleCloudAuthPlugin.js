export class GoogleCloudAuthPlugin {

	constructor( { apiToken } ) {

		this.name = 'GOOGLE_CLOUD_AUTH_PLUGIN';
		this.apiToken = apiToken;
		this.sessionToken = null;

		this._onLoadCallback = null;
		this._visibilityChangeCallback = null;

	}

	init( tiles ) {

		this._onLoadCallback = () => {

			// find the session id in the first sub tile set
			tiles.traverse( tile => {

				if ( tile.content && tile.content.uri ) {

					this.sessionToken = new URL( tile.content.uri ).searchParams.get( 'session' );
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

		if ( this.sessionToken !== null ) {

			uri = new URL( uri );
			if ( /^http/.test( uri.protocol ) ) {

				uri.searchParams.append( 'session', this.sessionToken );
				uri.searchParams.append( 'key', this.apiToken );

			}
			return uri.toString();

		} else {

			return uri;

		}

	}

}
