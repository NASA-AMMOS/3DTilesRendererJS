import { PointCloudEffectsPlugin } from '../pointcloud/PointCloudEffectsPlugin.js';

export class PotreePlugin extends PointCloudEffectsPlugin {

	url: string | null;
	pointScale: number;
	useRecommendedSettings: boolean;

	constructor( options?: {
		url?: string | null,
		pointScale?: number,
		useRecommendedSettings?: boolean,
		pointShape?: 'square' | 'round' | 'sphere',
		minPointSize?: number,
		edlStrength?: number,
		edlRadius?: number,
		debugColorMode?: 'none' | 'node' | 'depth' | 'tile',
	} );

}
