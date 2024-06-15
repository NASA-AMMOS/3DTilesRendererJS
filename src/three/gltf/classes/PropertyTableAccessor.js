import { ClassProperty } from './ClassProperty.js';
import { initializeFromClass } from './ClassPropertyHelpers.js';
import {
	PropertySetAccessor,
	getArrayConstructorFromType,
	getDataValue,
	getField,
	isNumericType,
} from './PropertySetAccessor.js';

class PropertyTableClassProperty extends ClassProperty {

	constructor( enums, classProperty, tableProperty ) {

		super( enums, classProperty, tableProperty );

		this.values = tableProperty.values;
		this.arrayOffsets = getField( tableProperty, 'arrayOffsets', null );
		this.stringOffsets = getField( tableProperty, 'stringOffsets', null );
		this.arrayOffsetType = getField( tableProperty, 'arrayOffsetType', 'UINT32' );
		this.stringOffsetType = getField( tableProperty, 'stringOffsetType', 'UINT32' );

	}

	getArrayLengthFromId( buffers, id ) {

		let count = this.count;
		if ( this.arrayOffsets !== null ) {

			const { arrayOffsets, arrayOffsetType } = this;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( buffers[ arrayOffsets ] );
			count = arr[ id + 1 ] - arr[ id ];

		}

		return count;

	}

	getIndexOffsetFromId( buffers, id ) {

		let indexOffset = id;
		if ( this.arrayOffsets ) {

			const { arrayOffsets, arrayOffsetType } = this;
			const arr = new ( getArrayConstructorFromType( arrayOffsetType ) )( buffers[ arrayOffsets ] );
			indexOffset = arr[ indexOffset ];

		} else if ( this.array ) {

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

		this.initProperties( PropertyTableClassProperty );

	}

	getData( id, target = {} ) {

		initializeFromClass( this.class, target );

		const properties = this.class.properties;
		for ( const name in properties ) {

			target[ name ] = this.getPropertyValue( name, id, target[ name ] );

		}

		return target;

	}

	_readValueAtIndex( name, id, index, target = null ) {

		const property = this.properties[ name ];
		const componentType = property.componentType;
		const type = property.type;

		const bufferView = this.data[ property.values ];
		const dataArray = new ( getArrayConstructorFromType( componentType, type ) )( bufferView );

		// TODO: is this correct?
		let indexOffset = property.getIndexOffsetFromId( this.data, id );

		if ( isNumericType( type ) || type === 'ENUM' ) {

			target = getDataValue( dataArray, index + indexOffset, type, target );

		} else if ( type === 'STRING' ) {

			indexOffset += index;

			// TODO: is this correct?
			let stringLength = 0;
			if ( property.stringOffsets !== null ) {

				const { stringOffsets, stringOffsetType } = property;
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

		return target;

	}

	getPropertyValue( name, id, target = null ) {

		// check if the requested id is outside of the size of the table
		if ( id >= this.count ) {

			throw new Error( 'PropertyTableAccessor: Requested index is outside the range of the table.' );

		}

		// check to see if we skip this field since its not in the table
		const tableProperty = this.definition.properties[ name ];
		const property = this.properties[ name ];
		if ( ! tableProperty ) {

			if ( ! property ) {

				throw new Error( 'PropertyTableAccessor: Requested property does not exist.' );

			} else {

				return property.resolveDefault( target );

			}

		}

		// TODO: is this correct?
		// get the dynamic array count from the property buffer
		const array = property.array;
		const count = property.getArrayLengthFromId( this.data, id );

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
