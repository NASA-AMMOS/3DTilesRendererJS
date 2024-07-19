import { FeatureTable } from './FeatureTable.js';

export class BatchTable extends FeatureTable {

	constructor( buffer, batchSize, start, headerLength, binLength ) {

		super( buffer, start, headerLength, binLength );
		this.batchSize = batchSize;

	}

	getData( key, componentType = null, type = null ) {

		console.warn( 'BatchTable: BatchTable.getData is deprecated. Use BatchTable.getDataFromId instead.' );
		return super.getData( key, this.batchSize, componentType, type );

	}

	getDataFromId( id, target = {} ) {

		if ( id < 0 || id >= this.batchSize ) {

			throw new Error( `BatchTable: id value "${ id }" out of bounds for "${ this.batchSize }" features number.` );

		}

		for ( const key of this.getKeys() ) {

			if ( key !== 'extensions' ) {

				target[ key ] = super.getData( key, this.batchSize )[ id ];

			}

		}

		return target;

	}

}
