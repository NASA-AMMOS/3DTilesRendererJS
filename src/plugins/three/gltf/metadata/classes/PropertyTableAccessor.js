import { ClassProperty } from './ClassProperty.js';
import { PropertySetAccessor } from './PropertySetAccessor.js';
import {
	initializeFromClass,
	getArrayConstructorFromComponentType,
	readDataFromBufferToType,
	getField,
	isNumericType,
	typeToComponentCount,
} from '../utilities/ClassPropertyHelpers.js';

class PropertyTableClassProperty extends ClassProperty {

	constructor( enums, classProperty, tableProperty = null ) {

		super( enums, classProperty, tableProperty );

		this.values = tableProperty.values;
		this.valueLength = typeToComponentCount( this.type );
		this.arrayOffsets = getField( tableProperty, 'arrayOffsets', null );
		this.stringOffsets = getField( tableProperty, 'stringOffsets', null );
		this.arrayOffsetType = getField( tableProperty, 'arrayOffsetType', 'UINT32' );
		this.stringOffsetType = getField( tableProperty, 'stringOffsetType', 'UINT32' );

	}

	// returns the necessary array length based on the array offsets if present
	getArrayLengthFromId( buffers, id ) {

		let count = this.count;
		if ( this.arrayOffsets !== null ) {

			const { arrayOffsets, arrayOffsetType } = this;
			const bufferCons = getArrayConstructorFromComponentType( arrayOffsetType );
			const arr = new bufferCons( buffers[ arrayOffsets ] );
			count = arr[ id + 1 ] - arr[ id ];

		}

		return count;

	}

	// returns the index offset into the data buffer for the given id based on the
	// the array offsets if present
	getIndexOffsetFromId( buffers, id ) {

		let indexOffset = id;
		if ( this.arrayOffsets ) {

			const { arrayOffsets, arrayOffsetType } = this;
			const bufferCons = getArrayConstructorFromComponentType( arrayOffsetType );
			const arr = new bufferCons( buffers[ arrayOffsets ] );
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
		const bufferCons = getArrayConstructorFromComponentType( componentType, type );
		const dataArray = new bufferCons( bufferView );

		// array offsets contain element offsets, not byte offsets
		const indexOffset = property.getIndexOffsetFromId( buffers, id );

		if ( isNumericType( type ) || type === 'ENUM' ) {

			// "readDataFromBufferToType" takes the start offset to read from so we multiply the
			// index by the final value length
			return readDataFromBufferToType( dataArray, ( indexOffset + index ) * property.valueLength, type, target );

		} else if ( type === 'STRING' ) {

			// https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata/#variable-length-arrays

			let stringIndex = indexOffset + index;
			let stringLength = 0;
			if ( property.stringOffsets !== null ) {

				// get the string lengths and beginning offsets if variable
				const { stringOffsets, stringOffsetType } = property;
				const bufferCons = getArrayConstructorFromComponentType( stringOffsetType );
				const stringOffsetBuffer = new bufferCons( buffers[ stringOffsets ] );
				stringLength = stringOffsetBuffer[ stringIndex + 1 ] - stringOffsetBuffer[ stringIndex ];
				stringIndex = stringOffsetBuffer[ stringIndex ];

			}

			const byteArray = new Uint8Array( dataArray.buffer, stringIndex, stringLength );
			target = new TextDecoder().decode( byteArray );

		} else if ( type === 'BOOLEAN' ) {

			const offset = indexOffset + index;
			const byteIndex = Math.floor( offset / 8 );
			const bitIndex = offset % 8;
			const bitValue = ( dataArray[ byteIndex ] >> bitIndex ) & 1;
			target = bitValue === 1;

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

		// convert to enum strings - no data enum values are stored as strings
		target = property.resolveEnumsToStrings( target );

		// resolve to default values
		target = property.resolveNoData( target );

		return target;

	}

}
