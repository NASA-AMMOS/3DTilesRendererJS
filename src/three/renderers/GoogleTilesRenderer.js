import { Matrix4 } from 'three';
import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';
import { WGS84_ELLIPSOID } from '../math/GeoConstants.js';
import { GoogleMapsTilesCredits } from './GoogleMapsTilesCredits.js';

const API_ORIGIN = 'https://tile.googleapis.com';
const TILE_URL = `${ API_ORIGIN }/v1/3dtiles/root.json`;
const _mat = new Matrix4();
const GoogleTilesRendererMixin = base => class extends base {

	get ellipsoid() {

		return WGS84_ELLIPSOID;

	}

	constructor( apiKey, baseUrl = TILE_URL ) {

		super( new URL( `${ baseUrl }?key=${ apiKey }` ).toString() );

		this._credits = new GoogleMapsTilesCredits();

		this.fetchOptions.mode = 'cors';
		this.parseQueue.maxJobs = 10;
		this.downloadQueue.maxJobs = 30;
		this.lruCache.minSize = 3000;
		this.lruCache.maxSize = 5000;
		this.errorTarget = 20;

		this.onLoadTileSet = tileset => {

			// find the session id in the first sub tile set
			let session;
			this.traverse( tile => {

				if ( tile.content && tile.content.uri ) {

					session = new URL( tile.content.uri ).searchParams.get( 'session' );
					return true;

				}

				return false;

			} );

			// adjust the url preprocessor to include the api key, session
			this.preprocessURL = uri => {

				uri = new URL( uri );
				if ( /^http/.test( uri.protocol ) ) {

					uri.searchParams.append( 'session', session );
					uri.searchParams.append( 'key', apiKey );

				}
				return uri.toString();

			};

			// clear the callback once the root is loaded
			this.onLoadTileSet = null;

		};

		this.onTileVisibilityChange = ( scene, tile, visible ) => {

			const copyright = tile.cached.metadata.asset.copyright || '';
			if ( visible ) {

				this._credits.addCredits( copyright );

			} else {

				this._credits.removeCredits( copyright );

			}

		};

	}

	getCreditsString() {

		return this._credits.toString();

	}

	setLatLonToYUp( lat, lon ) {

		const { ellipsoid, group } = this;

		_mat.makeRotationX( - Math.PI / 2 );
		ellipsoid.constructLatLonFrame( lat, lon, group.matrix )
			.invert()
			.premultiply( _mat )
			.decompose(
				group.position,
				group.quaternion,
				group.scale,
			);

	}

};

export const GoogleTilesRenderer = GoogleTilesRendererMixin( TilesRenderer );
export const DebugGoogleTilesRenderer = GoogleTilesRendererMixin( DebugTilesRenderer );
