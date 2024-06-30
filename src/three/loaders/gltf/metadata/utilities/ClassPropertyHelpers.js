import {
	Vector2,
	Vector3,
	Vector4,
	Matrix3,
	Matrix4,
} from 'three';
import { Matrix2 } from '../math/Matrix2.js';

// returns the field in the object with a resolved default
export function getField( object, key, def ) {

	return object && key in object ? object[ key ] : def;

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
export function getMaxValue( componentType ) {

	const tokens = /([A-Z]+)([0-9]+)/.exec( componentType );
	const unsigned = tokens[ 1 ] === 'UINT';
	const bits = parseInt( tokens[ 2 ] );

	if ( unsigned ) {

		return ( 1 << bits ) - 1;

	} else {

		return ( 1 << ( bits - 1 ) ) - 1;

	}

}

// returns a value from the given buffer of the given type
export function readDataFromBufferToType( buffer, offset, type, target = null ) {

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

// returns false if the given value is not of "type"
export function isTypeInstance( type, value ) {

	if ( value === null || value === undefined ) {

		return false;

	}

	switch ( type ) {

		case 'SCALAR': return value instanceof Number;
		case 'VEC2': return value.isVector2;
		case 'VEC3': return value.isVector3;
		case 'VEC4': return value.isVector4;
		case 'MAT2': return value.isMatrix2;
		case 'MAT3': return value.isMatrix3;
		case 'MAT4': return value.isMatrix4;
		case 'BOOLEAN': return value instanceof Boolean;
		case 'STRING': return value instanceof String;
		case 'ENUM': return value instanceof Number || value instanceof String;

	}

}

// gets a new numeric array constructor from the given structural metadata type
export function getArrayConstructorFromType( componentType, type ) {

	switch ( componentType ) {

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

	}

	switch ( type ) {

		case 'BOOLEAN': return Uint8Array;
		case 'STRING': return Uint8Array;

	}

}

// resolve a full default value for the given property including arrays
export function resolveDefault( property, target = null ) {

	const array = property.array;
	if ( array ) {

		target = target && Array.isArray( target ) ? target : [];
		target.length = property.count;
		for ( let i = 0, l = target.length; i < l; i ++ ) {

			target[ i ] = resolveDefaultElement( property, target[ i ] );

		}

	} else {

		target = resolveDefaultElement( property, target );

	}

	return target;

}

// gets the default value of the given type
export function resolveDefaultElement( property, target = null ) {

	const defaultValue = property.default;
	const type = property.type;

	if ( defaultValue === null ) {

		return null;

	} else {

		// TODO: make sure the default uses the same major order for matrices in three.js
		target = target || getTypeInstance( type );
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( let i = 0, l = elements.length; i < l; i ++ ) {

				elements[ i ] = defaultValue[ i ];

			}

		} else if ( isVectorType( type ) ) {

			target.fromArray( defaultValue );

		} else {

			return defaultValue;

		}

	}

}

// check for of instances of "no data" in the given target value and adjust them to the
// default value.
export function resolveNoData( property, target ) {

	if ( property.noData === null ) {

		return target;

	}

	const noData = property.noData;
	const type = property.type;
	if ( Array.isArray( target ) ) {

		for ( let i = 0, l = target.length; i < l; i ++ ) {

			target[ i ] = performResolution( target[ i ] );

		}

	} else {

		target = performResolution( target );

	}

	return target;

	// replace the value with a default if no data is encountered
	function performResolution( target ) {

		if ( isNoDataEqual( target ) ) {

			target = resolveDefaultElement( property, target );

		}

		return target;

	}

	// checks if the given value is equal to the no data value
	function isNoDataEqual( value ) {

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

}

// scales the value based on property settings
// the provided target value is normalized, scaled, and then offset if numeric
export function adjustValueScaleOffset( property, target ) {

	const {
		type,
		componentType,
		scale,
		offset,
		normalized,
	} = property;

	if ( Array.isArray( target ) ) {

		for ( let i = 0, l = target.length; i < l; i ++ ) {

			target[ i ] = adjustFromType( target[ i ] );

		}

	} else {

		target = adjustFromType( target );

	}

	return target;

	function adjustFromType( value ) {

		if ( value === null ) {

			return null;

		}

		if ( isMatrixType( type ) ) {

			value = adjustMatrix( value );

		} else if ( isVectorType( type ) ) {

			value = adjustVector( value );

		} else {

			value = adjustScalar( value );

		}

		return value;

	}

	function adjustVector( value ) {

		value.x = adjustScalar( value.x );
		value.y = adjustScalar( value.y );
		if ( 'z' in value ) value.z = adjustScalar( value.z );
		if ( 'w' in value ) value.w = adjustScalar( value.w );
		return value;

	}

	function adjustMatrix( value ) {

		const elements = value.elements;
		for ( let i = 0, l = elements.length; i < l; i ++ ) {

			elements[ i ] = adjustScalar( elements[ i ] );

		}

		return value;

	}

	function adjustScalar( value ) {

		if ( normalized ) {

			value = value / getMaxValue( componentType );

		}

		if ( normalized || isFloatType( componentType ) ) {

			// TODO: what order are these operations supposed to be performed in?
			value = value * scale + offset;

		}

		return value;

	}

}

// Shape the given target object based on the provided property. If overrideCount is
// provided then it will be used to specify the array length.
export function initializeFromProperty( property, target, overrideCount = null ) {

	if ( property.array ) {

		if ( ! Array.isArray( target ) ) {

			target = new Array( property.count || 0 );

		}

		target.length = overrideCount !== null ? overrideCount : property.count;

		for ( let i = 0, l = target.length; i < l; i ++ ) {

			if ( ! isTypeInstance( property.type, target[ i ] ) ) {

				target[ i ] = getTypeInstance( property.type );

			}

		}

	} else {

		if ( ! isTypeInstance( property.type, target ) ) {

			target = getTypeInstance( property.type );

		}

	}

	return target;

}

// Shape the "target" object based on the provided set of properties
export function initializeFromClass( properties, target ) {

	// remove unused fields
	for ( const key in target ) {

		if ( ! ( key in properties ) ) {

			delete target[ key ];

		}

	}

	// add and adjust any fields required by the set of properties
	for ( const key in properties ) {

		const prop = properties[ key ];
		target[ key ] = initializeFromProperty( prop, target[ key ] );

	}

}
