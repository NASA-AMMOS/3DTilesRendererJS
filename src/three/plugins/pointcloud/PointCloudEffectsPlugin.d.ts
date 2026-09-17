export class PointCloudEffectsPlugin {

	pointShape: 'square' | 'round' | 'sphere';
	minPointSize: number;
	edlStrength: number;
	edlRadius: number;
	debugColorMode: 'none' | 'node' | 'depth' | 'tile';

	constructor( options?: {
		pointShape?: 'square' | 'round' | 'sphere',
		minPointSize?: number,
		edlStrength?: number,
		edlRadius?: number,
		debugColorMode?: 'none' | 'node' | 'depth' | 'tile',
	} );

}
