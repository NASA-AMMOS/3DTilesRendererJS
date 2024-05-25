// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
// discard it due to how "noData" is handled

import { PropertyAttributeAccessor } from './PropertyAttributeAccessor';
import { PropertyTableAccessor } from './PropertyTableAccessor.js';
import { PropertyTextureAccessor } from './PropertyTextureAccessor.js';

export class StructuralMetadata {

	constructor( definition, textures, buffers ) {

		const {
			schema,
			propertyTables = [],
			propertyTextures = [],
			propertyAttributes = [],
		} = definition;

		const { enums, classes } = schema;
		const tableAccessors = propertyTables.map( t => new PropertyTableAccessor( t, classes, enums, buffers ) );
		const textureAccessors = propertyTextures.map( t => new PropertyTextureAccessor( t, classes, enums, textures ) );
		const attributeAccessors = propertyAttributes.map( t => new PropertyAttributeAccessor( t, classes, enums ) );
		const accessors = [
			...tableAccessors,
			...textureAccessors,
			...attributeAccessors,
		].reduce( ( result, acc ) => result[ acc.name ] = acc, {} );

		this.schema = schema;
		this.accessors = accessors;
		this.tableAccessors = tableAccessors;
		this.textureAccessors = textureAccessors;
		this.attributeAccessors = attributeAccessors;

	}

	getAccessor( name ) {

		return this.accessors[ name ];

	}

	getPropertyTableAtIndex( index ) {

		return this.tableAccessors[ index ];

	}

}

export class NodeStructuralMetaData {

	constructor( rootMetadata, nodeMetadata, object ) {

		this.rootMetadata = rootMetadata;
		this.nodeMetadata = nodeMetadata;
		this.object = object;

	}

	// returns all the data associated with the id
	// TODO: how should these functions be exposed?
	// TODO: rename the functions
	/*
	getData( id, triangle, barycoord, target = null ) {

		target = target || {};

		const accessors = this.accessors;
		for ( const key in accessors ) {

			target[ key ] = target[ key ] || {};

			const accessor = accessors[ key ];
			accessor.class.properties.forEach( prop => {

				if ( accessor.isPropertyTextureAccessor ) {

					target[ key ][ prop.name ] = this.getPropertyValue( key, prop.name, id, target[ key ][ prop.name ] );

				} else {

					target[ key ][ prop.name ] = this.getPropertyValueAtTexel( key, prop.name, triangle, barycoord, target[ key ][ prop.name ] );

				}


			} );

		}

	}
	*/

	// TODO: functions for accessing full class data
	// TODO: use the node metadata object

	getAccessor( name ) {

		const nodeMetadata = this.nodeMetadata;
		const accessor = this.rootMetadata.getAccessor( name );
		if ( nodeMetadata ) {

			if ( accessor.isPropertyTextureAccessor ) {

				const index = this.propertyTextures.indexOf( accessor );
				if ( ! nodeMetadata.propertyTextures || ! nodeMetadata.propertyTextures.includes( index ) ) {

					throw new Error();

				}

			} else if ( accessor.isPropertyAttributeAccessor ) {

				const index = this.propertyAttributes.indexOf( accessor );
				if ( ! nodeMetadata.propertyAttributes || ! nodeMetadata.propertyAttributes.includes( index ) ) {

					throw new Error();

				}

			} else {

				throw new Error();

			}

		}

		return accessor;

	}

	getPropertyTableAtIndex( index ) {

		const nodeMetadata = this.nodeMetadata;
		if ( nodeMetadata ) {

			index = nodeMetadata.propertyTables[ index ];

		}

		const accessor = this.rootMetadata.getPropertyTableAtIndex( index );
		return this.getAccessor( accessor.name );

	}

	// direct accessors
	getPropertyValueAtIndex( accessorName, propertyName, id, arrayIndex, target = null ) {

		const accessor = this.getAccessor( accessorName );
		if ( accessor.isPropertyTextureAccessor ) {

			return accessor.getPropertyValue( propertyName, id, arrayIndex, this.object.geometry, target );

		} else {

			return accessor.getPropertyValue( propertyName, id, arrayIndex, target );

		}

	}

	getPropertyValue( accessorName, propertyName, id, target = null ) {

		const accessor = this.getAccessor( accessorName );
		if ( accessor.isPropertyTextureAccessor ) {

			return accessor.getPropertyValue( propertyName, id, this.object.geometry, target );

		} else {

			return accessor.getPropertyValue( propertyName, id, target );

		}

	}

	getPropertyValuesAtTexel( accessorName, propertyName, triangle, barycoord, target = null ) {

		this.getAccessor( accessorName ).getPropertyValuesAtTexel( propertyName, triangle, barycoord, target );

	}

	getPropertyValueAtTexel( accessorName, propertyName, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexel( accessorName, [ propertyName ], triangle, barycoord, target );

	}

	getPropertyValuesAtTexelAsync( accessorName, propertyName, triangle, barycoord, target = null ) {

		this.getAccessor( accessorName ).getPropertyValuesAtTexelAsync( propertyName, triangle, barycoord, target );

	}

	getPropertyValueAtTexelAsync( accessorName, propertyName, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexelAsync( accessorName, [ propertyName ], triangle, barycoord, target );

	}

}
