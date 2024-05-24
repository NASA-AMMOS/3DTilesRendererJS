import { PropertyAccessor, getArrayConstructorFromType, getDataValue, getField, getMaxValue, getTypeInstance, isFloatType, isMatrixType, isNoDataEqual, isNumericType, isVectorType, resolveDefault } from './PropertyAccesssor.js';

export class PropertyTableAccessor extends PropertyAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTable = true;
		this.count = this.definition.count;

	}

	getPropertyValueAtIndex( name, id, index, target = null ) {

		if ( id >= this.count ) {

			throw new Error( 'PropertyTableAccessor: Requested index is outside the range of the table.' );

		}

		const property = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const valueType = this._getPropertyValueType( name );
		const type = classProperty.type;
		if ( ! property ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyTableAccessor: Requested property does not exist.' );

			} else {

				return resolveDefault( classProperty.default, type, target );

			}

		}

		if ( target === null ) {

			target = getTypeInstance( type );

		}

		const bufferView = this.data[ property.values ];
		const dataArray = new ( getArrayConstructorFromType( valueType ) )( bufferView );

		// TODO: is this correct?
		let indexOffset = id;
		if ( 'arrayOffsets' in property ) {

			const { arrayOffsets, arrayOffsetType } = property;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( this.data[ arrayOffsets ] );
			indexOffset = arr[ indexOffset ];

		}

		if ( type === 'ENUM' ) {

			target = this._enumValueToName( classProperty.enumType, target );

		} else if ( isNumericType( type ) ) {

			const normalized = getField( classProperty, 'normalized', false );
			const valueScale = getField( property, 'scale', getField( classProperty, 'scale', 1 ) );
			const valueOffset = getField( property, 'offset', getField( classProperty, 'offset', 0 ) );
			const isFloat = isFloatType( type );

			getDataValue( dataArray, index + indexOffset, type, target );

			if ( isMatrixType( type ) ) {

				target = adjustMatrix( target );

			} else if ( isVectorType( type ) ) {

				target = adjustVector( target );

			} else {

				target = adjustScalar( target );

			}

			function adjustVector( value ) {

				if ( value === null ) {

					return null;

				}

				value.x = adjustScalar( value.x );
				value.y = adjustScalar( value.y );
				if ( 'z' in value ) value.z = adjustScalar( value.z );
				if ( 'w' in value ) value.w = adjustScalar( value.w );
				return value;

			}

			function adjustMatrix( value ) {

				if ( value === null ) {

					return null;

				}

				const elements = value.elements;
				for ( let i = 0, l = elements.length; i < l; i ++ ) {

					elements[ i ] = adjustScalar( elements[ i ] );

				}

				return value;

			}

			function adjustScalar( value ) {

				if ( value === null ) {

					return null;

				}

				if ( normalized ) {

					value = value / getMaxValue( type );

				}

				if ( normalized || isFloat ) {

					// TODO: what order are these operations supposed to be performed in?
					value = value * valueScale + valueOffset;

				}

				return value;

			}

		} else if ( type === 'STRING' ) {

			// TODO: is this correct?
			let stringLength = 0;
			if ( 'stringOffsets' in property ) {

				const { stringOffsets, stringOffsetType } = property;
				const arr = new ( getArrayConstructorFromType( stringOffsetType ) )( this.data[ stringOffsets ] );
				stringLength = arr[ indexOffset + 1 ] - arr[ indexOffset ];
				indexOffset = arr[ indexOffset ];

			}

			for ( let i = 0; i < stringLength; i ++ ) {

				target += String.fromCharCode( dataArray[ i ] );

			}

		}

		// handle the case of no data
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty.default, type, target );

		}

		return target;

	}

	getPropertyValue( name, id, target = null ) {

		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;
		const array = getField( classProperty, 'array', false );
		const count = getField( classProperty, 'count', null );

		// TODO: what do we do if the array count isn't defined
		// TODO: need to determine string length from arrayOffsets / stringOffsets
		// TODO: it's inefficient to handle arrays this way because recreate the needed buffers every time
		if ( array && count !== null ) {

			while ( target.length < count ) {

				target.push( getTypeInstance( type ) );

			}

			target.length = count;

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this.getPropertyValueAtIndex( name, id, i, target );

			}

		} else {

			return this.getPropertyValueAtIndex( name, id, 0, target );

		}

	}

}
