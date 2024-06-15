import { initializeFromClass, initializeFromProperty } from './ClassPropertyHelpers.js';
import {
	PropertySetAccessor,
	adjustValue,
	getArrayConstructorFromType,
	getDataValue,
	getField,
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

		initializeFromClass( this.class, target );

		const properties = this.class.properties;
		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, target[ name ] );

		}

		return target;

	}

	_getPropertyValueAtIndex( name, id, index, target = null ) {

		const tableProperty = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const componentType = this._getPropertyComponentType( name );
		const type = classProperty.type;

		const bufferView = this.data[ tableProperty.values ];
		const dataArray = new ( getArrayConstructorFromType( componentType ) )( bufferView );

		// TODO: is this correct?
		let indexOffset = id;
		if ( 'arrayOffsets' in tableProperty ) {

			const {
				arrayOffsets,
				arrayOffsetType = 'UINT32',
			} = tableProperty;
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

		} else if ( isNumericType( type ) ) {

			// TODO: we need to handle array lengths correctly here?
			target = getDataValue( dataArray, index + indexOffset, type, target );

		} else if ( type === 'STRING' ) {

			indexOffset += index;

			// TODO: is this correct?
			let stringLength = 0;
			if ( 'stringOffsets' in tableProperty ) {

				const {
					stringOffsets,
					stringOffsetType = 'UINT32',
				} = tableProperty;
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

			target = resolveDefault( classProperty, target );

		}

		return target;

	}

	getPropertyValue( name, id, target = null ) {

		// check if the requested id is outside of the size of the table
		if ( id >= this.count ) {

			throw new Error( 'PropertyTableAccessor: Requested index is outside the range of the table.' );

		}

		// check to see if we skip this field since its not in the table
		const tableProperty = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;
		if ( ! tableProperty ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyTableAccessor: Requested property does not exist.' );

			} else {

				return resolveDefault( classProperty, target );

			}

		}

		// TODO: is this correct?
		// get the dynamic array count from the property buffer
		let count = null;
		if ( 'arrayOffsets' in tableProperty ) {

			const {
				arrayOffsets,
				arrayOffsetType = 'UINT32',
			} = tableProperty;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( this.data[ arrayOffsets ] );
			count = arr[ id + 1 ] - arr[ id ];

		}

		// get the final array length
		const array = getField( classProperty, 'array', false );
		count = getField( classProperty, 'count', count );

		// initialize the array
		target = initializeFromProperty( classProperty, target, count );

		// TODO: need to determine string length from arrayOffsets / stringOffsets
		// TODO: it's inefficient to handle arrays this way because recreate the needed buffers every time
		if ( array ) {

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this._getPropertyValueAtIndex( name, id, i, target[ i ] );

			}

		} else {

			target = this._getPropertyValueAtIndex( name, id, 0, target );

		}

		// scale the numeric values
		if ( isNumericType( type ) ) {

			const componentType = this._getPropertyComponentType( name );
			const normalized = getField( classProperty, 'normalized', false );
			const valueScale = getField( tableProperty, 'scale', getField( classProperty, 'scale', 1 ) );
			const valueOffset = getField( tableProperty, 'offset', getField( classProperty, 'offset', 0 ) );
			target = adjustValue( type, componentType, valueScale, valueOffset, normalized, target );

		}

		// convert to enum strings
		if ( type === 'ENUM' ) {

			const enumType = classProperty.enumType;
			target = this._convertToEnumNames( enumType, target );

		}

		return target;

	}

}
