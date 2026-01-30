import { Group, PointsMaterial, LineBasicMaterial, MeshBasicMaterial } from 'three';
import { VectorTileStyler } from './VectorTileStyler.js';

export class VectorTileMeshRenderer {

	styler: VectorTileStyler;
	enableDensification: boolean;
	densityThreshold: number;
	defaultPointsMaterial: PointsMaterial;
	defaultLineMaterial: LineBasicMaterial;
	defaultMeshMaterial: MeshBasicMaterial;

	constructor( styler: VectorTileStyler, options?: {
		enableDensification?: boolean,
		densityThreshold?: number,
		pointsMaterial?: PointsMaterial,
		lineMaterial?: LineBasicMaterial,
		meshMaterial?: MeshBasicMaterial,
	} );

	render( vectorTile: any ): Group;

}
