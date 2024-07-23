import { TilesRenderer } from '../TilesRenderer';
import { DebugTilesRenderer } from '../DebugTilesRenderer';
import { Ellipsoid } from '../math/Ellipsoid';

export class GoogleTilesRenderer extends TilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( apiKey: String );
	getCreditsString(): String;
	setLatLonToYUp( lat: Number, lon: Number ): void;

}

export class DebugGoogleTilesRenderer extends DebugTilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( apiKey: String );
	getCreditsString(): String;
	setLatLonToYUp( lat: Number, lon: Number ): void;

}

export class GooglePhotorealisticTilesRenderer extends TilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( url?: string );
	getCreditsString(): String;
	setLatLonToYUp( lat: Number, lon: Number ): void;

}

export class DebugGooglePhotorealisticTilesRenderer extends DebugTilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( url?: string );
	getCreditsString(): String;
	setLatLonToYUp( lat: Number, lon: Number ): void;

}
