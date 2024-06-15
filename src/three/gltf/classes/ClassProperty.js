import { adjustValue, getField, resolveDefault, resolveNoData } from './Utils.js';

export class ClassProperty {

	constructor( enums, property, accessorProperty = null ) {

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
		this.enumSet = null;

		if ( accessorProperty ) {

			this.offset = getField( accessorProperty, 'offset', this.offset );
			this.scale = getField( accessorProperty, 'scale', this.scale );
			this.max = getField( accessorProperty, 'max', this.max );
			this.min = getField( accessorProperty, 'min', this.min );

		}

		if ( property.type === 'ENUM' ) {

			this.enumSet = enums[ this.enumType ];
			if ( this.componentType === null ) {

				this.componentType = getField( this.enumSet, 'valueType', 'UINT16' );

			}

		}

	}

	resolveDefault( target ) {

		return resolveDefault( this, target );

	}

	resolveNoData( target ) {

		return resolveNoData( this, target );

	}

	adjustValueScales( target ) {

		return adjustValue( this.type, this.componentType, this.scale, this.offset, this.normalized, target );

	}

}
