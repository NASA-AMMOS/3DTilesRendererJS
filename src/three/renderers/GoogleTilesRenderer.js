import { TilesRenderer } from '../TilesRenderer.js';
import { DebugTilesRenderer } from '../DebugTilesRenderer.js';
import { GoogleCloudAuthPlugin } from '../plugins/GoogleCloudAuthPlugin.js';

const API_ORIGIN = 'https://tile.googleapis.com';
const TILE_URL = `${ API_ORIGIN }/v1/3dtiles/root.json`;

const GooglePhotorealisticTilesRendererMixin = base => class extends base {

	constructor( url = TILE_URL ) {

		super( url );

		console.warn( 'GooglePhotorealisticTilesRenderer: Class has been deprecated. Use "TilesRenderer" with "GoogleCloudAuthPlugin" instead.' );

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

		console.warn( 'GoogleTilesRenderer: Class has been deprecated. Use "GoogleCloudAuthPlugin" instead.' );

	}

};

export const GoogleTilesRenderer = GoogleTilesRendererMixin( TilesRenderer );
export const DebugGoogleTilesRenderer = GoogleTilesRendererMixin( DebugTilesRenderer );

export const GooglePhotorealisticTilesRenderer = GooglePhotorealisticTilesRendererMixin( TilesRenderer );
export const DebugGooglePhotorealisticTilesRenderer = GooglePhotorealisticTilesRendererMixin( DebugTilesRenderer );
