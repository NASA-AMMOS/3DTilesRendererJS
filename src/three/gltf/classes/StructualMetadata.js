// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
// discard it due to how "noData" is handled

import { PropertyAttributeAccessor } from './PropertyAttributeAccessor';
import { PropertyTableAccessor } from './PropertyTableAccessor.js';
import { PropertyTextureAccessor } from './PropertyTextureAccessor.js';

export class StructuralMetadata {

	constructor( definition, textures, buffers, nodeMetadata = null, object = null ) {

		const {
			schema,
			propertyTables = [],
			propertyTextures = [],
			propertyAttributes = [],
		} = definition;

		// TODO: filter the attribute + texture accessors here?
		const { enums, classes } = schema;
		const tableAccessors = propertyTables.map( t => new PropertyTableAccessor( t, classes, enums, buffers ) );
		let textureAccessors = [];
		let attributeAccessors = [];

		if ( nodeMetadata ) {

			if ( nodeMetadata.propertyTextures ) {

				textureAccessors = nodeMetadata.propertyTextures.map( i => new PropertyTextureAccessor( propertyTextures[ i ], classes, enums, textures ) );

			}

			if ( nodeMetadata.propertyAttributes ) {

				attributeAccessors = nodeMetadata.propertyAttributes.map( i => new PropertyAttributeAccessor( propertyAttributes[ i ], classes, enums ) );

			}

		}

		this.schema = schema;
		this.tableAccessors = tableAccessors;
		this.textureAccessors = textureAccessors;
		this.attributeAccessors = attributeAccessors;
		this.object = object;
		this.nodeMetadata = nodeMetadata;

	}

	// Property Tables
	getPropertyTable( tableIndex ) {

		return this.tableAccessors[ tableIndex ];

	}

	getPropertyTableData( tableIndices, ids, target = [] ) {

		const length = Math.min( tableIndices.length, ids.length );
		target.length = length;

		for ( let i = 0; i < length; i ++ ) {

			const table = this.getPropertyTable( tableIndices[ i ] );
			target[ i ] = table.getData( ids[ i ], target[ i ] );

		}

		return target;

	}

	getPropertyTableInfo( tableIndices ) {

		return tableIndices.map( i => {

			const table = this.getPropertyTable( i );
			return {
				name: table.name,
				className: table.definition.class,
			};

		} );

	}

	// Property Textures
	getPropertyTextureData( triangle, barycoord, target = {} ) {

	}

	getPropertyTextureDataAsync( triangle, barycoord, target = {} ) {

	}

	// Property Attributes
	getPropertyAttributeData( attributeIndex, target = [] ) {

		const attributeAccessors = this.attributeAccessors;
		target.length = attributeAccessors.length;

		for ( let i = 0; i < attributeAccessors.length; i ++ ) {

			const accessor = attributeAccessors[ i ];
			target[ i ] = accessor.getData( attributeIndex, this.object.geometry, target[ i ] );

		}

		return target;

	}

	getPropertyAttributeInfo() {

		return this.attributeAccessors.map( acc => {

			return {
				name: acc.name,
				className: acc.definition.class,
			};

		} );

	}

}
