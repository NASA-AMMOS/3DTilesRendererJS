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

