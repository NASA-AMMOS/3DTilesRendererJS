import { PropertySetAccessor, getTypeInstance, isMatrixType, isNoDataEqual, isVectorType, resolveDefault } from './PropertySetAccessor.js';

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

		const properties = this.class.properties;
		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, geometry, target[ name ] );

		}

		// remove unused fields
		for ( const key in target ) {

			if ( ! ( key in properties ) ) {

				delete target[ key ];

			}

		}

		return target;

	}

	getPropertyValue( name, id, geometry, target = null ) {

		// NOTE: arrays are not supported via attribute accessors
		if ( id >= this.count ) {

			throw new Error( 'PropertyAttributeAccessor: Requested index is outside the range of the table.' );

		}

		// TODO: reduce this logic duplication
		const property = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;
		if ( ! property ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyAttributeAccessor: Requested property does not exist.' );

			} else {

				return resolveDefault( classProperty.default, type, target );

			}

		}

		// get a default target
		if ( target === null ) {

			target = getTypeInstance( type );

		}

		const attribute = geometry.getAttribute( property.attribute.toLowerCase() );
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( let i = 0, l = elements.length; i < l; i < l ) {

				elements[ i ] = attribute.getComponent( id, i );

			}

		} else if ( isVectorType( type ) ) {

			target.fromBufferAttribute( attribute, id );

		} else if ( type === 'SCALAR' ) {

			target = attribute.getX( id );

		} else {

			// BOOLEAN, STRING, ENUM not supported
			throw new Error( 'StructuredMetadata.PropertyAttributeAccessor: BOOLEAN, STRING, and ENUM types are not supported by property attributes.' );

		}

		// handle the case of no data
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty.default, type, target );

		}

		return target;

	}

}
