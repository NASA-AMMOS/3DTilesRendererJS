import { BatchTableHierarchyExtension } from './BatchTableHierarchyExtension.js';
import { FeatureTable } from './FeatureTable.js';

export class BatchTable extends FeatureTable {

	get batchSize() {

		console.warn( 'BatchTable.batchSize has been deprecated and replaced with BatchTable.count.' );
		return this.count;

	}

	constructor( buffer, count, start, headerLength, binLength ) {

		super( buffer, start, headerLength, binLength );
		this.count = count;

		this.extensions = {};
		const extensions = this.header.extensions;
		if ( extensions ) {

			if ( extensions[ '3DTILES_batch_table_hierarchy' ] ) {

				this.extensions[ '3DTILES_batch_table_hierarchy' ] = new BatchTableHierarchyExtension( this );

			}

		}

	}

	getData( key, componentType = null, type = null ) {

		console.warn( 'BatchTable: BatchTable.getData is deprecated. Use BatchTable.getDataFromId to get all' +
			'properties for an id or BatchTable.getPropertyArray for getting an array of value for a property.' );
		return super.getData( key, this.count, componentType, type );

	}

	getDataFromId( id, target = {} ) {

		if ( id < 0 || id >= this.count ) {

			throw new Error( `BatchTable: id value "${ id }" out of bounds for "${ this.count }" features number.` );

		}

		for ( const key of this.getKeys() ) {

			if ( key !== 'extensions' ) {

				target[ key ] = super.getData( key, this.count )[ id ];

			}

		}

		for ( const extensionName in this.extensions ) {

			const extension = this.extensions[ extensionName ];

			if ( extension.getDataFromId instanceof Function ) {

				target[ extensionName ] = target[ extensionName ] || {};
				extension.getDataFromId( id, target[ extensionName ] );

			}

		}

		return target;

	}

	getPropertyArray( key ) {

		return super.getData( key, this.count );

	}


}
