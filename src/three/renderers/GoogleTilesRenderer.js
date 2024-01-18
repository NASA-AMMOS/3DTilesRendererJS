import { Euler, Matrix4 } from 'three';
import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';
import { WGS84_ELLIPSOID } from '../math/GeoConstants.js';
import { GoogleMapsTilesCredits } from './GoogleMapsTilesCredits.js';

const API_ORIGIN = 'https://tile.googleapis.com';
const TILE_URL = `${ API_ORIGIN }/v1/3dtiles/root.json`;
const _mat = new Matrix4();
const _euler = new Euler();
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
		this.errorTarget = 40;

		const onLoadCallback = () => {

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
			this.removeEventListener( 'load-tile-set', onLoadCallback );

		};

		this.addEventListener( 'load-tile-set', onLoadCallback );

		this.addEventListener( 'tile-visibility-change', e => {

			const { tile, visible } = e;
			const copyright = tile.cached.metadata.asset.copyright || '';
			if ( visible ) {

				this._credits.addCredits( copyright );

			} else {

				this._credits.removeCredits( copyright );

			}

		} );

	}

	getCreditsString() {

		return this._credits.toString();

	}

	// adjust the rotation of the group such that Y is altitude, X is North, and Z is East
	setLatLonToYUp( lat, lon ) {

		const { ellipsoid, group } = this;

		_euler.set( Math.PI / 2, Math.PI / 2, 0 );
		_mat.makeRotationFromEuler( _euler );

		ellipsoid.constructLatLonFrame( lat, lon, group.matrix )
			.multiply( _mat )
			.invert()
			.decompose(
				group.position,
				group.quaternion,
				group.scale,
			);

		group.updateMatrixWorld( true );

	}

};

export const GoogleTilesRenderer = GoogleTilesRendererMixin( TilesRenderer );
export const DebugGoogleTilesRenderer = GoogleTilesRendererMixin( DebugTilesRenderer );
