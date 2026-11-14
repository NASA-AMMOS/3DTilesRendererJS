export class PointCloudEffectsPlugin {

	pointShape: 'square' | 'round' | 'sphere';
	minPointSize: number;
	maxPointSize: number;
	edlStrength: number;
	edlRadius: number;
	debugColorMode: 'none' | 'node' | 'depth' | 'tile';
	adaptivePointSize: boolean;
	pointScale: number;

	constructor( options?: {
		pointShape?: 'square' | 'round' | 'sphere',
		minPointSize?: number,
		maxPointSize?: number,
		edlStrength?: number,
		edlRadius?: number,
		debugColorMode?: 'none' | 'node' | 'depth' | 'tile',
		adaptivePointSize?: boolean,
		pointScale?: number,
	} );

}
