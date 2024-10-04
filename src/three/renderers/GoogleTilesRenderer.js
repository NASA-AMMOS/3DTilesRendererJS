import { Euler, Matrix4 } from 'three';
import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';
import { GoogleCloudAuthPlugin } from '../plugins/GoogleCloudAuthPlugin.js';

const API_ORIGIN = 'https://tile.googleapis.com';
const TILE_URL = `${ API_ORIGIN }/v1/3dtiles/root.json`;
const _mat = new Matrix4();
const _euler = new Euler();

const EllipsoidTilesRendererMixin = base => class extends base {

	// adjust the rotation of the group such that Y is altitude, X is North, and Z is East
	setLatLonToYUp( lat, lon ) {

		const { ellipsoid, group } = this;

		_euler.set( Math.PI / 2, Math.PI / 2, 0 );
		_mat.makeRotationFromEuler( _euler );

		ellipsoid.getEastNorthUpFrame( lat, lon, group.matrix )
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

const GooglePhotorealisticTilesRendererMixin = base => class extends EllipsoidTilesRendererMixin( base ) {

	constructor( url = TILE_URL ) {

		super( url );

		this.fetchOptions.mode = 'cors';
		this.parseQueue.maxJobs = 10;
		this.downloadQueue.maxJobs = 30;
		this.errorTarget = 40;

	}

	getCreditsString() {

		console.warn( 'GooglePhotorealisticTilesRenderer: "getCreditsString" function is deprecated. Use "getAttributions", instead.' );
		return this.getAttributions()[ 0 ].value;

	}

};

const GoogleTilesRendererMixin = base => class extends GooglePhotorealisticTilesRendererMixin( base ) {

	constructor( apiToken, url ) {

		super( url );
		this.registerPlugin( new GoogleCloudAuthPlugin( { apiToken } ) );

		console.warn( 'GoogleTilesRenderer: Class has been deprecated. Use "GooglePhotorealisticTilesRenderer" with "GoogleCloudAuthPlugin" instead.' );

	}

};

export const GoogleTilesRenderer = GoogleTilesRendererMixin( TilesRenderer );
export const DebugGoogleTilesRenderer = GoogleTilesRendererMixin( DebugTilesRenderer );

export const GooglePhotorealisticTilesRenderer = GooglePhotorealisticTilesRendererMixin( TilesRenderer );
export const DebugGooglePhotorealisticTilesRenderer = GooglePhotorealisticTilesRendererMixin( DebugTilesRenderer );

export const EllipsoidTilesRenderer = EllipsoidTilesRendererMixin( TilesRenderer );
