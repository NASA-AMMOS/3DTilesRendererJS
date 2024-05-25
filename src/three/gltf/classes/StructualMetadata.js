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

	getPropertyTable( tableIndex ) {

		return this.tableAccessors[ tableIndex ];

	}

	// TODO: name is not guaranteed
	getPropertyTableData( tableIndices, ids, target = {} ) {

		const l = Math.min( tableIndices.length, ids.length );
		for ( let i = 0; i < l; i ++ ) {

			const table = this.getPropertyTable( tableIndices[ i ] );
			target[ table.name ] = table.getData( ids[ i ], target[ table.name ] );

		}

		return target;

	}

	getPropertyTextureData( triangle, barycoord, target = {} ) {

	}

	getPropertyTextureDataAsync( triangle, barycoord, target = {} ) {

	}

	getPropertyAttributeData( attributeIndex, target = {} ) {

		const attributeAccessors = this.attributeAccessors;
		for ( let i = 0; i < attributeAccessors.length; i ++ ) {

			const accessor = attributeAccessors[ i ];
			target[ accessor.name ] = accessor.getData( attributeIndex, this.object.geometry, target[ accessor.name ] );

		}

		return target;

	}

}
