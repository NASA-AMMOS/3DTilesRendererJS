export class PotreePlugin {

	pointScale: number;
	pointShape: 'square' | 'round' | 'sphere';
	minPointSize: number;
	edlStrength: number;
	edlRadius: number;
	debugColorMode: 'none' | 'node' | 'depth' | 'tile';

	constructor( options?: {
		url?: string | null,
		pointScale?: number,
		pointShape?: 'square' | 'round' | 'sphere',
		minPointSize?: number,
		edlStrength?: number,
		edlRadius?: number,
		debugColorMode?: 'none' | 'node' | 'depth' | 'tile',
	} );

}
