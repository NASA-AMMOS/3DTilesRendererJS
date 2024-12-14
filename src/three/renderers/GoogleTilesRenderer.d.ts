import { TilesRenderer } from '../TilesRenderer';
import { DebugTilesRenderer } from '../DebugTilesRenderer';
import { Ellipsoid } from '../math/Ellipsoid';

export class GoogleTilesRenderer extends TilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( apiKey: string );
	getCreditsString(): string;
	setLatLonToYUp( lat: number, lon: number ): void;

}

export class DebugGoogleTilesRenderer extends DebugTilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( apiKey: string );
	getCreditsString(): string;
	setLatLonToYUp( lat: number, lon: number ): void;

}

export class GooglePhotorealisticTilesRenderer extends TilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( url?: string );
	getCreditsString(): string;
	setLatLonToYUp( lat: number, lon: number ): void;

}

export class DebugGooglePhotorealisticTilesRenderer extends DebugTilesRenderer {

	ellipsoid: Ellipsoid;

	constructor( url?: string );
	getCreditsString(): string;
	setLatLonToYUp( lat: number, lon: number ): void;

}
