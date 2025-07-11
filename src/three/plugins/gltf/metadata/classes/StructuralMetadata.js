import { PropertyAttributeAccessor } from './PropertyAttributeAccessor.js';
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
		this.textures = textures;
		this.nodeMetadata = nodeMetadata;

	}

	// Property Tables
	getPropertyTableData( tableIndices, ids, target = null ) {

		if ( ! Array.isArray( tableIndices ) || ! Array.isArray( ids ) ) {

			// only return a single tables data
			target = target || {};

			const table = this.tableAccessors[ tableIndices ];
			target = table.getData( ids, target );

		} else {

			// return data from an array of tables and ids
			target = target || [];

			const length = Math.min( tableIndices.length, ids.length );
			target.length = length;

			for ( let i = 0; i < length; i ++ ) {

				const table = this.tableAccessors[ tableIndices[ i ] ];
				target[ i ] = table.getData( ids[ i ], target[ i ] );

			}

		}

		return target;

	}

	getPropertyTableInfo( tableIndices = null ) {

		// default to all table information
		if ( tableIndices === null ) {

			tableIndices = this.tableAccessors.map( ( t, i ) => i );

		}

		if ( Array.isArray( tableIndices ) ) {

			// return all table information from the requested list
			return tableIndices.map( i => {

				const table = this.tableAccessors[ i ];
				return {
					name: table.name,
					className: table.definition.class,
				};

			} );

		} else {

			// return the one piece of table information
			const table = this.tableAccessors[ tableIndices ];
			return {
				name: table.name,
				className: table.definition.class,
			};

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

	async getPropertyTextureDataAsync( triangle, barycoord, target = [] ) {

		const textureAccessors = this.textureAccessors;
		target.length = textureAccessors.length;

		const promises = [];
		for ( let i = 0; i < textureAccessors.length; i ++ ) {

			const accessor = textureAccessors[ i ];
			const promise = accessor
				.getDataAsync( triangle, barycoord, this.object.geometry, target[ i ] )
				.then( result => {

					target[ i ] = result;

				} );

			promises.push( promise );

		}

		await Promise.all( promises );

		return target;

	}

	getPropertyTextureInfo() {

		return this.textureAccessors;

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

	dispose() {

		this.textureAccessors.forEach( acc => acc.dispose() );
		this.tableAccessors.forEach( acc => acc.dispose() );
		this.attributeAccessors.forEach( acc => acc.dispose() );

	}

}
