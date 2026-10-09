import { TilesRenderer } from '3d-tiles-renderer/playcanvas';

export class ReorientationPlugin {

	constructor( options?: {
		lat?: number | null,
		lon?: number | null,
		height?: number,
		up?: string,
		recenter?: boolean,
		azimuth?: number,
		elevation?: number,
		roll?: number,
	} );

	tiles: TilesRenderer | null;
	lat: number | null;
	lon: number | null;
	height: number;
	up: string;
	recenter: boolean;
	azimuth: number;
	elevation: number;
	roll: number;

	transformLatLonHeightToOrigin( lat: number, lon: number, height?: number, azimuth?: number, elevation?: number, roll?: number ): void;

}
