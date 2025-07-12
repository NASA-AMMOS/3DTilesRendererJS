export class ReorientationPlugin {

	constructor( options?: {
		up?: '+x' | '-x' | '+y' | '-y' | '+z' | '-z',
		recenter?: boolean,

		lat?: number | null,
		lon?: number | null,
		height?: number,

		azimuth?: number,
		elevation?: number,
		roll?: number,
	} );

	transformLatLonHeightToOrigin( lat: number, lon: number, height?: number, azimuth?: number, elevation?: number, roll?: number ): void;

}
