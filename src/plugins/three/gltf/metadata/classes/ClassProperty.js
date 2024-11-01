import {
	initializeFromProperty,
	adjustValueScaleOffset,
	getField,
	isNumericType,
	resolveDefaultElement,
	resolveNoData,
	resolveDefault,
} from '../utilities/ClassPropertyHelpers.js';

export class ClassProperty {

	constructor( enums, property, accessorProperty = null ) {

		// initialize defaults for class property info
		this.name = property.name || null;
		this.description = property.description || null;
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
		this.accessorProperty = accessorProperty;

		// accessor properties can override min, max, offset, and scale values
		if ( accessorProperty ) {

			this.offset = getField( accessorProperty, 'offset', this.offset );
			this.scale = getField( accessorProperty, 'scale', this.scale );
			this.max = getField( accessorProperty, 'max', this.max );
			this.min = getField( accessorProperty, 'min', this.min );

		}

		// get the component type for the provided enum
		if ( property.type === 'ENUM' ) {

			this.enumSet = enums[ this.enumType ];
			if ( this.componentType === null ) {

				this.componentType = getField( this.enumSet, 'valueType', 'UINT16' );

			}

		}

	}

	// shape the given target to match the data type of the property
	// enums are set to their integer value
	shapeToProperty( target, countOverride = null ) {

		return initializeFromProperty( this, target, countOverride );

	}

	// resolve the given object to the default value for the property for a single element
	// enums are set to a default string
	resolveDefaultElement( target ) {

		return resolveDefaultElement( this, target );

	}

	// resolve the target to the default value for the property for every element if it's an array
	// enums are set to a default string
	resolveDefault( target ) {

		return resolveDefault( this, target );

	}

	// converts any instances of no data to the default value
	resolveNoData( target ) {

		return resolveNoData( this, target );

	}

	// converts enums integers in the given target to strings
	resolveEnumsToStrings( target ) {

		const enumSet = this.enumSet;
		if ( this.type === 'ENUM' ) {

			if ( Array.isArray( target ) ) {

				for ( let i = 0, l = target.length; i < l; i ++ ) {

					target[ i ] = getEnumName( target[ i ] );

				}

			} else {

				target = getEnumName( target );

			}


		}

		return target;

		function getEnumName( index ) {

			const match = enumSet.values.find( e => e.value === index );
			if ( match === null ) {

				// the default "default enum" value is an empty string when we can't find a match
				// in a case where enums are defined correctly we should never get here.
				return '';

			} else {

				return match.name;

			}

		}

	}

	// apply scales
	adjustValueScaleOffset( target ) {

		if ( isNumericType( this.type ) ) {

			return adjustValueScaleOffset( this, target );

		} else {

			return target;

		}

	}

}
