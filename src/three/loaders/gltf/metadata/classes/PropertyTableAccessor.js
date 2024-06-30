import { ClassProperty } from './ClassProperty.js';
import { PropertySetAccessor } from './PropertySetAccessor.js';
import {
	initializeFromClass,
	getArrayConstructorFromType,
	readDataFromBufferToType,
	getField,
	isNumericType,
} from '../utilities/ClassPropertyHelpers.js';

class PropertyTableClassProperty extends ClassProperty {

	constructor( enums, classProperty, tableProperty = null ) {

		super( enums, classProperty, tableProperty );

		this.valueLength = parseInt( this.type.replace( /[^0-9]/g, '' ) ) || 1;
		this.values = tableProperty.values;
		this.arrayOffsets = getField( tableProperty, 'arrayOffsets', null );
		this.stringOffsets = getField( tableProperty, 'stringOffsets', null );
		this.arrayOffsetType = getField( tableProperty, 'arrayOffsetType', 'UINT32' );
		this.stringOffsetType = getField( tableProperty, 'stringOffsetType', 'UINT32' );

	}

	// returns the necessary array length based on the array offsets if present
	getArrayLengthFromId( buffers, id ) {

		let count = this.count;
		if ( this.arrayOffsets !== null ) {

			const { arrayOffsets, arrayOffsetType, type } = this;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType, type ) )( buffers[ arrayOffsets ] );
			count = arr[ id + 1 ] - arr[ id ];

		}

		return count;

	}

	// returns the index offset into the data buffer for the given id based on the
	// the array offsets if present
	getIndexOffsetFromId( buffers, id ) {

		let indexOffset = id;
		if ( this.arrayOffsets ) {

			const { arrayOffsets, arrayOffsetType, type } = this;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType, type ) )( buffers[ arrayOffsets ] );
			indexOffset = arr[ indexOffset ];

		} else if ( this.array ) {

			// TODO: why do this? Revisit
			indexOffset *= this.count;

		}

		return indexOffset;

	}

}

export class PropertyTableAccessor extends PropertySetAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTableAccessor = true;
		this.count = this.definition.count;

		this._initProperties( PropertyTableClassProperty );

	}

	getData( id, target = {} ) {

		const properties = this.properties;
		initializeFromClass( properties, target );

		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, target[ name ] );

		}

		return target;

	}

	// reads an individual element
	_readValueAtIndex( name, id, index, target = null ) {

		const property = this.properties[ name ];
		const { componentType, type } = property;

		const buffers = this.data;
		const bufferView = buffers[ property.values ];
		const dataArray = new ( getArrayConstructorFromType( componentType, type ) )( bufferView );

		// TODO: is this correct?
		let indexOffset = property.getIndexOffsetFromId( buffers, id );

		if ( isNumericType( type ) || type === 'ENUM' ) {

			// multiply the stride of the value type into the index
			// TODO: is it correct to multiply it in here when array offsets are provided?
			const valueLength = property.valueLength;
			target = readDataFromBufferToType( dataArray, valueLength * ( index + indexOffset ), type, target );

		} else if ( type === 'STRING' ) {

			indexOffset += index;

			// TODO: is this correct?
			let stringLength = 0;
			if ( property.stringOffsets !== null ) {

				const { stringOffsets, stringOffsetType } = property;
				const arr = new ( getArrayConstructorFromType( stringOffsetType, type ) )( buffers[ stringOffsets ] );
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

		return target;

	}

	// Reads the data for the given table index
	getPropertyValue( name, id, target = null ) {

		// check if the requested id is outside of the size of the table
		if ( id >= this.count ) {

			throw new Error( 'PropertyTableAccessor: Requested index is outside the range of the table.' );

		}

		// check to see if we skip this field since its not in the table
		const property = this.properties[ name ];
		if ( ! property ) {

			throw new Error( 'PropertyTableAccessor: Requested property does not exist.' );

		} else if ( ! this.definition.properties[ name ] ) {

			return property.resolveDefault( target );

		}

		// TODO: is this correct?
		// get the dynamic array count from the property buffer
		const array = property.array;
		const buffers = this.data;
		const count = property.getArrayLengthFromId( buffers, id );

		// initialize the array
		target = property.shapeToProperty( target, count );

		// read all data
		if ( array ) {

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this._readValueAtIndex( name, id, i, target[ i ] );

			}

		} else {

			target = this._readValueAtIndex( name, id, 0, target );

		}

		// scale the numeric values
		target = property.adjustValueScaleOffset( target );

		// resolve to default values
		target = property.resolveNoData( target );

		// convert to enum strings
		target = property.resolveEnumsToStrings( target );

		return target;

	}

}
