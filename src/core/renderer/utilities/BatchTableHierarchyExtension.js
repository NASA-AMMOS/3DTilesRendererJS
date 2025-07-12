import { parseBinArray } from './FeatureTable.js';

export class BatchTableHierarchyExtension {

	constructor( batchTable ) {

		this.batchTable = batchTable;

		const extensionHeader = batchTable.header.extensions[ '3DTILES_batch_table_hierarchy' ];

		this.classes = extensionHeader.classes;
		for ( const classDef of this.classes ) {

			const instances = classDef.instances;
			for ( const property in instances ) {

				classDef.instances[ property ] = this._parseProperty( instances[ property ], classDef.length, property );

			}

		}

		this.instancesLength = extensionHeader.instancesLength;

		this.classIds = this._parseProperty( extensionHeader.classIds, this.instancesLength, 'classIds' );

		if ( extensionHeader.parentCounts ) {

			this.parentCounts = this._parseProperty( extensionHeader.parentCounts, this.instancesLength, 'parentCounts' );

		} else {

			this.parentCounts = new Array( this.instancesLength ).fill( 1 );

		}

		if ( extensionHeader.parentIds ) {

			const parentIdsLength = this.parentCounts.reduce( ( a, b ) => a + b, 0 );
			this.parentIds = this._parseProperty( extensionHeader.parentIds, parentIdsLength, 'parentIds' );

		} else {

			this.parentIds = null;

		}

		this.instancesIds = [];
		const classCounter = {};
		for ( const classId of this.classIds ) {

			classCounter[ classId ] = classCounter[ classId ] ?? 0;
			this.instancesIds.push( classCounter[ classId ] );
			classCounter[ classId ] ++;

		}

	}

	_parseProperty( property, propertyLength, propertyName ) {

		if ( Array.isArray( property ) ) {

			return property;

		} else {

			const { buffer, binOffset } = this.batchTable;

			const byteOffset = property.byteOffset;
			const componentType = property.componentType || 'UNSIGNED_SHORT';

			const arrayStart = binOffset + byteOffset;

			return parseBinArray( buffer, arrayStart, propertyLength, 'SCALAR', componentType, propertyName );

		}

	}

	getDataFromId( id, target = {} ) {

		// Get properties inherited from parents

		const parentCount = this.parentCounts[ id ];

		if ( this.parentIds && parentCount > 0 ) {

			let parentIdsOffset = 0;
			for ( let i = 0; i < id; i ++ ) {

				parentIdsOffset += this.parentCounts[ i ];

			}

			for ( let i = 0; i < parentCount; i ++ ) {

				const parentId = this.parentIds[ parentIdsOffset + i ];
				if ( parentId !== id ) {

					this.getDataFromId( parentId, target );

				}

			}

		}

		// Get properties proper to this instance

		const classId = this.classIds[ id ];
		const instances = this.classes[ classId ].instances;
		const className = this.classes[ classId ].name;
		const instanceId = this.instancesIds[ id ];

		for ( const key in instances ) {

			target[ className ] = target[ className ] || {};
			target[ className ][ key ] = instances[ key ][ instanceId ];

		}

		return target;

	}

}
