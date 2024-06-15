import { getField, resolveDefault } from './PropertySetAccessor.js';

export class ClassProperty {

	constructor( property ) {

		this.type = property.type;
		this.componentType = property.componentType || null;
		this.enumType = property.enumType || null;
		this.array = property.array || false;
		this.count = property.count || 0;
		this.normalized = property.normalized || false;
		this.offset = property.offset || 0;
		this.scale = getField( property, 'scale', 1 );
		this.max = getField( property, 'max', Infinity );
		this.min = getField( property, 'min', - Infinity );
		this.required = property.required || false;
		this.noData = getField( property, 'noData', null );
		this.default = getField( property, 'default', null );
		this.semantic = getField( property, 'semantic', null );

	}

	resolveDefault( target ) {

		return resolveDefault( this, target );

	}

}
