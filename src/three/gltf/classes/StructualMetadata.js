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

}

export class NodeStructuralMetaData {

	constructor( rootMetadata, nodeMetadata, object ) {

		this.rootMetadata = rootMetadata;
		this.nodeMetadata = nodeMetadata;
		this.object = object;

	}

	// TODO: functions for accessing full class data
	// TODO: use the node metadata object

	// direct accessors
	getPropertyValueAtIndex( accessorName, propertyName, id, arrayIndex, target = null ) {

		const accessor = this.getAccessor( accessorName );
		if ( accessor.isPropertyAttributeTexture ) {

			return accessor.getPropertyValue( propertyName, id, arrayIndex, this.object.geometry, target );

		} else {

			return accessor.getPropertyValue( propertyName, id, arrayIndex, target );

		}

	}

	getPropertyValue( accessorName, propertyName, id, target = null ) {

		const accessor = this.getAccessor( accessorName );
		if ( accessor.isPropertyAttributeTexture ) {

			return accessor.getPropertyValue( propertyName, id, this.object.geometry, target );

		} else {

			return accessor.getPropertyValue( propertyName, id, target );

		}

	}

	getPropertyValuesAtTexel( accessorName, propertyName, triangle, barycoord, target = null ) {

		this.rootMetadata.getAccessor( accessorName ).getPropertyValuesAtTexel( propertyName, triangle, barycoord, target );

	}

	getPropertyValueAtTexel( accessorName, propertyName, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexel( accessorName, [ propertyName ], triangle, barycoord, target );

	}

	getPropertyValuesAtTexelAsync( accessorName, propertyName, triangle, barycoord, target = null ) {

		this.rootMetadata.getAccessor( accessorName ).getPropertyValuesAtTexelAsync( propertyName, triangle, barycoord, target );

	}

	getPropertyValueAtTexelAsync( accessorName, propertyName, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexelAsync( accessorName, [ propertyName ], triangle, barycoord, target );

	}

}
