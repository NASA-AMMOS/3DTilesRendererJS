import {
	PropertySetAccessor,
	adjustValue,
	getArrayConstructorFromType,
	getDataValue,
	getField,
	getTypeInstance,
	isNoDataEqual,
	isNumericType,
	resolveDefault,
} from './PropertySetAccessor.js';

export class PropertyTableAccessor extends PropertySetAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTableAccessor = true;
		this.count = this.definition.count;

	}

	getData( id, target = {} ) {

		const properties = this.class.properties;
		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, target[ name ] );

		}

		// remove unused fields
		for ( const key in target ) {

			if ( ! ( key in properties ) ) {

				delete target[ key ];

			}

		}

		return target;

	}

	getPropertyValueAtIndex( name, id, index, target = null ) {

		if ( id >= this.count ) {

			throw new Error( 'PropertyTableAccessor: Requested index is outside the range of the table.' );

		}

		const property = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const componentType = this._getPropertyComponentType( name );
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
		const dataArray = new ( getArrayConstructorFromType( componentType ) )( bufferView );

		// TODO: is this correct?
		let indexOffset = id;
		if ( 'arrayOffsets' in property ) {

			const {
				arrayOffsets,
				arrayOffsetType = 'UINT32',
			} = property;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( this.data[ arrayOffsets ] );
			indexOffset = arr[ indexOffset ];

		} else {

			const array = getField( classProperty, 'array', false );
			if ( array ) {

				const count = getField( classProperty, 'count', 1 );
				indexOffset *= count;

			}

		}

		if ( type === 'ENUM' ) {

			target = getDataValue( dataArray, index + indexOffset, type, target );
			target = this._enumValueToName( classProperty.enumType, target );

		} else if ( isNumericType( type ) ) {

			const normalized = getField( classProperty, 'normalized', false );
			const valueScale = getField( property, 'scale', getField( classProperty, 'scale', 1 ) );
			const valueOffset = getField( property, 'offset', getField( classProperty, 'offset', 0 ) );

			// TODO: we need to handle array lengths correctly here?
			target = getDataValue( dataArray, index + indexOffset, type, target );
			target = adjustValue( target, type, componentType, valueScale, valueOffset, normalized );

		} else if ( type === 'STRING' ) {

			indexOffset += index;

			// TODO: is this correct?
			let stringLength = 0;
			if ( 'stringOffsets' in property ) {

				const {
					stringOffsets,
					stringOffsetType = 'UINT32',
				} = property;
				const arr = new ( getArrayConstructorFromType( stringOffsetType ) )( this.data[ stringOffsets ] );
				stringLength = arr[ indexOffset + 1 ] - arr[ indexOffset ];
				indexOffset = arr[ indexOffset ];

			}

			const byteArray = new Uint8Array( dataArray.buffer, indexOffset, stringLength );
			target = new TextDecoder().decode( byteArray );

		} else if ( type === 'BOOLEAN' ) {

			const offset = indexOffset + index;
			const byteOffset = Math.floor( offset / 8 );
			const bitOffset = offset % 8;
			const byte = dataArray[ byteOffset ];

			target = Boolean( byte & ( 1 << bitOffset ) );

		}

		// handle the case of no data
		// TODO: this enum needs to be handled before enum has been converted
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty.default, type, target );

		}

		return target;

	}

	getPropertyValue( name, id, target = null ) {

		const property = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;

		// TODO: is this correct?
		// get the dynamic array count from the property buffer
		let count = null;
		if ( 'arrayOffsets' in property ) {

			const {
				arrayOffsets,
				arrayOffsetType = 'UINT32',
			} = property;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( this.data[ arrayOffsets ] );
			count = arr[ id + 1 ] - arr[ id ];

		}

		const array = getField( classProperty, 'array', false );
		count = getField( classProperty, 'count', count );

		// TODO: need to determine string length from arrayOffsets / stringOffsets
		// TODO: it's inefficient to handle arrays this way because recreate the needed buffers every time
		if ( array && count !== null ) {

			if ( target === null ) {

				target = [];

			}

			while ( target.length < count ) {

				target.push( getTypeInstance( type ) );

			}

			target.length = count;

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this.getPropertyValueAtIndex( name, id, i, target[ i ] );

			}

			return target;

		} else {

			return this.getPropertyValueAtIndex( name, id, 0, target );

		}

	}

}
