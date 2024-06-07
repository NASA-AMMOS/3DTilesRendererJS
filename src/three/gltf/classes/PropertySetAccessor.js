import {
	Vector2,
	Vector3,
	Vector4,
	Matrix3,
	Matrix4,
} from 'three';
import { Matrix2 } from './Matrix2.js';

// returns the field in the object with a resolved default
export function getField( object, key, def ) {

	return key in object ? object[ key ] : def;

}

// checks the structural metadata type
export function isNumericType( type ) {

	return type !== 'BOOLEAN' && type !== 'STRING' && type !== 'ENUM';

}

export function isFloatType( type ) {

	return /^FLOAT/.test( type );

}

export function isVectorType( type ) {

	return /^VEC/.test( type );

}

export function isMatrixType( type ) {

	return /^MATRIX/.test( type );

}

// returns the max value of the given type
export function getMaxValue( type ) {

	const tokens = /([A-Z]+)([0-9]+)/.exec( type );
	const unsigned = tokens[ 1 ] === 'UINT';
	const bits = parseInt( tokens[ 2 ] );

	if ( unsigned ) {

		return ( 1 << bits ) - 1;

	} else {

		return ( 1 << ( bits - 1 ) ) - 1;

	}

}

// returns a value from the given buffer of the given type
export function getDataValue( buffer, offset, type, target = null ) {

	if ( isMatrixType( type ) ) {

		const elements = target.elements;
		for ( let i = 0, l = elements.length; i < l; i ++ ) {

			elements[ i ] = buffer[ i + offset ];

		}

		return target;

	} else if ( isVectorType( type ) ) {

		target.x = buffer[ offset + 0 ];
		target.y = buffer[ offset + 1 ];
		if ( 'z' in target ) target.z = buffer[ offset + 2 ];
		if ( 'w' in target ) target.w = buffer[ offset + 3 ];
		return target;

	} else if ( type === 'BOOLEAN' ) {

		return Boolean( buffer[ offset ] );

	} else {

		return buffer[ offset ];

	}

}

// gets a new instance of the given structural metadata type
export function getTypeInstance( type ) {

	switch ( type ) {

		case 'SCALAR': return 0;
		case 'VEC2': return new Vector2();
		case 'VEC3': return new Vector3();
		case 'VEC4': return new Vector4();
		case 'MAT2': return new Matrix2();
		case 'MAT3': return new Matrix3();
		case 'MAT4': return new Matrix4();
		case 'BOOLEAN': return false;
		case 'STRING': return '';
		case 'ENUM': return 0;

	}

}

// gets a new numeric array constructor from the given structural metadata type
export function getArrayConstructorFromType( type ) {

	switch ( type ) {

		case 'INT8': return Int8Array;
		case 'INT16': return Int16Array;
		case 'INT32': return Int32Array;
		case 'INT64': return BigInt64Array;

		case 'UINT8': return Uint8Array;
		case 'UINT16': return Uint16Array;
		case 'UINT32': return Uint32Array;
		case 'UINT64': return BigUint64Array;

		case 'FLOAT32': return Float32Array;
		case 'FLOAT64': return Float64Array;

		case 'BOOLEAN': return Uint8Array;
		case 'STRING': return Uint8Array;

	}

}

// checks whether the value provided matches the "no data" value
export function isNoDataEqual( value, type, noData ) {

	if ( isMatrixType( type ) ) {

		const elements = value.elements;
		for ( let i = 0, l = noData.length; i < l; i ++ ) {

			if ( noData[ i ] !== elements[ i ] ) {

				return false;

			}

		}

		return true;

	} else if ( isVectorType( type ) ) {

		for ( let i = 0, l = noData.length; i < l; i ++ ) {

			if ( noData[ i ] !== value.getComponent( i ) ) {

				return false;

			}

		}

		return true;

	} else {

		return noData === value;

	}

}

// gets the default value of the given type
export function resolveDefault( value, type, target = null ) {

	if ( value === null || value === undefined ) {

		return null;

	} else {

		// TODO: make sure the default uses the same major order
		target = target || getTypeInstance( type );
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( let i = 0, l = elements.length; i < l; i ++ ) {

				elements[ i ] = value[ i ];

			}

		} else if ( isVectorType( type ) ) {

			target.fromArray( value );

		} else {

			return value;

		}

	}

}

// scales the value based on property settings
export function adjustValue( value, type, componentType, valueScale, valueOffset, normalized ) {

	if ( isMatrixType( type ) ) {

		value = adjustMatrix( value );

	} else if ( isVectorType( type ) ) {

		value = adjustVector( value );

	} else {

		value = adjustScalar( value );

	}

	return value;

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

			value = value / getMaxValue( componentType );

		}

		if ( normalized || isFloatType( componentType ) ) {

			// TODO: what order are these operations supposed to be performed in?
			value = value * valueScale + valueOffset;

		}

		return value;

	}

}

export class PropertySetAccessor {

	constructor( definition, classes = {}, enums = {}, data = null ) {

		this.definition = definition;
		this.class = classes[ definition.class ];
		this.enums = enums;
		this.data = data;
		this.name = 'name' in definition ? definition.name : null;

	}

	getPropertyNames() {

		return Object.keys( this.class.properties );

	}

	_getPropertyComponentType( name ) {

		const classProperty = this.class.properties[ name ];

		switch ( classProperty.type ) {

			case 'ENUM':
				return this._enumTypeToNumericType( classProperty.enumType );

			case 'STRING':
				return 'STRING';

			case 'BOOLEAN':
				return 'BOOLEAN';

			default:
				return classProperty.componentType;

		}

	}

	_enumTypeToNumericType( enumType ) {

		return this.enums[ enumType ].valueType || 'UINT16';

	}

	_enumValueToName( enumType, index ) {

		const enumArray = this.enums[ enumType ].values;
		for ( let i = 0, l = enumArray.length; i < l; i ++ ) {

			const e = enumArray[ i ];
			if ( e.value === index ) {

				return e.name;

			}

		}

	}

}
