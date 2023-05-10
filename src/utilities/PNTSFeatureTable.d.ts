import { BufferGeometry } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FeatureTable } from './FeatureTable';

export class PNTSFeatureTable extends FeatureTable {

	constructor(
		buffer : ArrayBuffer,
		start : Number,
		headerLength : Number,
		binLength : Number
	);

	isDracoEncoded(): boolean;

	setDracoLoader(loader: DRACOLoader);

	getDracoEncodedGeometry(): Promise<BufferGeometry>;

}
