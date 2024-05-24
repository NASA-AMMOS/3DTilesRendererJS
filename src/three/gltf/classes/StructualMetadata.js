// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
// discard it due to how "noData" is handled

import { PropertyAttributeAccessor } from './PropertyAttributeAccessor';
import { PropertyTableAccessor } from './PropertyTableAccessor.js';
import { PropertyTextureAccessor } from './PropertyTextureAccessor.js';

export class StructuralMetadata {

	constructor( definition, textures,  ) {

		// TODO

		const {
			schema,
			propertyTables,
			propertyTextures,
			propertyAttributes,
		} = definition;

		this.schema = schema;

		// table: requires a buffer view
		// texture: requires textures

		const { enums, classes } = schema;
		this.tableAccessors = propertyTables.map( t => new PropertyTableAccessor( t, null, enums, classes ) );
		this.textureAccessors = propertyTextures.map( t => new PropertyTextureAccessor( t, null, enums, classes ) );
		this.attributeAccessors = propertyAttributes.map( t => new PropertyAttributeAccessor( t, null, enums, classes ) );

	}

	getAccessor( key ) {

	}

}

