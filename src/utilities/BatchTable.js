import { FeatureTable } from './FeatureTable.js';

export class BatchTable extends FeatureTable {

	constructor( buffer, batchSize, start, headerLength, binLength ) {

		super( buffer, start, headerLength, binLength );
		this.batchSize = batchSize;

	}

	getData( key, componentType = null, type = null ) {

		return super.getData( key, this.batchSize, componentType, type );

	}

}
