// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
// discard it due to how "noData" is handled

import { PropertyAttributeAccessor } from './PropertyAttributeAccessor.js';
import { PropertyTableAccessor } from './PropertyTableAccessor.js';
import { PropertyTextureAccessor } from './PropertyTextureAccessor.js';

// TODO: produce a function to help initialize / validate an object structure for a given class
// to ensure the target values are well-formed
export class StructuralMetadata {

	constructor( definition, textures, buffers, nodeMetadata = null, object = null ) {

		const {
			schema,
			propertyTables = [],
			propertyTextures = [],
			propertyAttributes = [],
		} = definition;

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
	getPropertyTableData( tableIndices, ids, target = [] ) {

		const length = Math.min( tableIndices.length, ids.length );
		target.length = length;

		for ( let i = 0; i < length; i ++ ) {

			const table = this.tableAccessors[ tableIndices[ i ] ];
			target[ i ] = table.getData( ids[ i ], target[ i ] );

		}

		return target;

	}

	getPropertyTableInfo( tableIndices = null ) {

		if ( tableIndices === null ) {

			return this.tableAccessors.map( acc => {

				return {
					name: acc.name,
					className: acc.definition.class,
				};

			} );

		} else {

			return tableIndices.map( i => {

				const table = this.tableAccessors[ i ];
				return {
					name: table.name,
					className: table.definition.class,
				};

			} );

		}

	}

	// Property Textures
	getPropertyTextureData( triangle, barycoord, target = [] ) {

		const textureAccessors = this.textureAccessors;
		target.length = textureAccessors.length;

		for ( let i = 0; i < textureAccessors.length; i ++ ) {

			const accessor = textureAccessors[ i ];
			target[ i ] = accessor.getData( triangle, barycoord, this.object.geometry, target[ i ] );

		}

		return target;

	}

	getPropertyTextureDataAsync( triangle, barycoord, target = [] ) {

	}

	getPropertyTextureInfo() {

		return this.textureAccessors.map( acc => {

			return {
				name: acc.name,
				className: acc.definition.class,
			};

		} );

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
