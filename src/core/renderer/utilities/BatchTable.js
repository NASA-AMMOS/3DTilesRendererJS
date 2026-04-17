import { BatchTableHierarchyExtension } from './BatchTableHierarchyExtension.js';
import { FeatureTable } from './FeatureTable.js';

/**
 * Extends FeatureTable to provide indexed access to per-feature batch properties,
 * as found in B3DM and PNTS tiles.
 *
 * @extends FeatureTable
 */
export class BatchTable extends FeatureTable {

	get batchSize() {

		console.warn( 'BatchTable.batchSize has been deprecated and replaced with BatchTable.count.' );
		return this.count;

	}

	/**
	 * @param {ArrayBuffer} buffer
	 * @param {number} count - Number of features in the batch
	 * @param {number} start - Byte offset of the batch table within the buffer
	 * @param {number} headerLength - Byte length of the JSON header
	 * @param {number} binLength - Byte length of the binary body
	 */
	constructor( buffer, count, start, headerLength, binLength ) {

		super( buffer, start, headerLength, binLength );

		/**
		 * Total number of features in the batch.
		 * @type {number}
		 */
		this.count = count;

		/**
		 * Parsed extension objects keyed by extension name.
		 * @type {Object}
		 */
		this.extensions = {};
		const extensions = this.header.extensions;
		if ( extensions ) {

			if ( extensions[ '3DTILES_batch_table_hierarchy' ] ) {

				this.extensions[ '3DTILES_batch_table_hierarchy' ] = new BatchTableHierarchyExtension( this );

			}

		}

	}

	/**
	 * @deprecated Use `getDataFromId` or `getPropertyArray` instead.
	 * @param {string} key
	 * @param {string | null} [componentType]
	 * @param {string | null} [type]
	 * @returns {number | string | ArrayBufferView | null}
	 */
	getData( key, componentType = null, type = null ) {

		console.warn( 'BatchTable: BatchTable.getData is deprecated. Use BatchTable.getDataFromId to get all' +
			'properties for an id or BatchTable.getPropertyArray for getting an array of value for a property.' );
		return super.getData( key, this.count, componentType, type );

	}

	/**
	 * Returns an object with all properties of the batch table and its extensions for the
	 * given feature id. A `target` object can be specified to store the result. Throws if
	 * `id` is out of bounds.
	 * @param {number} id - Feature index (0 to count - 1)
	 * @param {Object} [target={}] - Optional object to write properties into
	 * @returns {Object}
	 */
	getDataFromId( id, target = {} ) {

		if ( id < 0 || id >= this.count ) {

			throw new Error( `BatchTable: id value "${ id }" out of bounds for "${ this.count }" features number.` );

		}

		for ( const key of this.getKeys() ) {

			target[ key ] = super.getData( key, this.count )[ id ];

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

	/**
	 * Returns the array of values for the given property key across all features. Returns
	 * `null` if the key is not in the table.
	 * @param {string} key
	 * @returns {Array | TypedArray | null}
	 */
	getPropertyArray( key ) {

		return super.getData( key, this.count );

	}


}
