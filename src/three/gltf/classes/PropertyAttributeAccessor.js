import { PropertyAccessor, getTypeInstance, isMatrixType, isNoDataEqual, isVectorType, resolveDefault } from './PropertyAccessor.js';

// TODO: is this only for points?
export class PropertyAttributeAccessor extends PropertyAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyAttributeAccessor = true;

	}

	getPropertyValue( name, id, target = null ) {

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

		const attribute = this.data[ property.attribute ];
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( let i = 0, l = elements.length; i < l; i < l ) {

				elements[ i ] = attribute.getComponent( id, i );

			}

		} else if ( isVectorType( type ) ) {

			target.fromBufferAttribute( attribute, id );

		} else if ( type === 'SCALAR' ) {

			target = attribute.getX( id );

		} else if ( type === 'BOOLEAN' ) {

			target = Boolean( attribute.getX( id ) );

		} else if ( type === 'STRING' ) {

			target = attribute.getX( id ).toString();

		} else if ( type === 'ENUM' ) {

			target = this._enumValueToName( classProperty.enumType, attribute.getX( id ) );

		}

		// handle the case of no data
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty.default, type, target );

		}

		return target;

	}

}
