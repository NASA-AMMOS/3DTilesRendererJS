import { initializeFromClass, initializeFromProperty } from './ClassPropertyHelpers.js';
import { PropertySetAccessor, adjustValue, getField, isMatrixType, isNoDataEqual, isVectorType, resolveDefault } from './PropertySetAccessor.js';

// TODO: is this only for points?
// TODO: consider a method for returning a raw type array reference rather than copying into buffer
// But then how is "no data" handled?
// TODO: Test "no data" path
export class PropertyAttributeAccessor extends PropertySetAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyAttributeAccessor = true;

	}

	getData( id, geometry, target = {} ) {

		initializeFromClass( this.class, target );

		const properties = this.class.properties;
		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, geometry, target[ name ] );

		}

		return target;

	}

	getPropertyValue( name, id, geometry, target = null ) {

		// NOTE: arrays are not supported via attribute accessors
		if ( id >= this.count ) {

			throw new Error( 'PropertyAttributeAccessor: Requested index is outside the range of the table.' );

		}

		// initialize the output value
		target = initializeFromProperty( classProperty, target );

		// use a default of the texture accessor definition does not include the value
		const accessorProperty = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;
		const componentType = classProperty.componentType;
		const enumType = classProperty.enumType;
		if ( ! accessorProperty ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyAttributeAccessor: Requested property does not exist.' );

			} else {

				return resolveDefault( classProperty, target );

			}

		}

		// Read the data values from the attribute
		const attribute = geometry.getAttribute( accessorProperty.attribute.toLowerCase() );
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( let i = 0, l = elements.length; i < l; i < l ) {

				elements[ i ] = attribute.getComponent( id, i );

			}

		} else if ( isVectorType( type ) ) {

			target.fromBufferAttribute( attribute, id );

		} else if ( type === 'SCALAR' || type === 'ENUM' ) {

			target = attribute.getX( id );

		} else {

			// BOOLEAN, STRING not supported
			throw new Error( 'StructuredMetadata.PropertyAttributeAccessor: BOOLEAN and STRING types are not supported by property attributes.' );

		}

		// adjust the value scales
		const normalized = getField( classProperty, 'normalized', false );
		const valueScale = getField( accessorProperty, 'scale', getField( classProperty, 'scale', 1 ) );
		const valueOffset = getField( accessorProperty, 'offset', getField( classProperty, 'offset', 0 ) );
		target = adjustValue( type, componentType, valueScale, valueOffset, normalized, target );

		// handle the case of no data
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty, target );

		}

		// convert the values to enum strings for output
		if ( type === 'ENUM' ) {

			target = this._convertToEnumNames( enumType, target );

		}

		return target;

	}

}
