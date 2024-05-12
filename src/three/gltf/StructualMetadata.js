import {
	Vector2,
	Vector3,
	Vector4,
	Matrix3,
	Matrix4,
} from 'three';
import { TextureReadUtility } from './utilities/TextureReadUtility.js';
import { getTexCoord, getTexelIndices, getTriangleIndices } from './utilities/TexCoordUtilities.js';

// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
// discard it due to how "noData" is handled

const _uv = new Vector2();
const _pixel = new Vector2();
const _dstPixel = new Vector2();

function getField( object, key, def ) {

	return key in object ? object[ key ] : def;

}

function isNumericType( type ) {

	return type !== 'BOOLEAN' && type !== 'STRING' && type !== 'ENUM';

}

function isFloatType( type ) {

	return /^FLOAT/.test( type );

}

function isVectorType( type ) {

	return /^VECTOR/.test( type );

}

function isMatrixType( type ) {

	return /^MATRIX/.test( type );

}

function getMaxValue( type ) {

	const tokens = /([A-Z]+)([0-9]+)/.exec( type );
	const unsigned = tokens[ 0 ] === 'UINT';
	const bits = parseInt( tokens[ 1 ] );

	if ( unsigned ) {

		return ( 1 << bits ) - 1;

	} else {

		return ( 1 << ( bits - 1 ) ) - 1;

	}

}

function getDataValue( buffer, offset, type, target = null ) {

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

function getTypeInstance( type ) {

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

function getArrayConstructorFromType( type ) {

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
		case 'FLOAT65': return Float64Array;

	}

}

function isNoDataEqual( value, type, noData ) {

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

function resolveDefault( value, type, target = null ) {

	if ( value === null || value === undefined ) {

		return null;

	} else {

		// TODO: make sure the default uses the same major order
		target = target || getTypeInstance( type );
		if ( isMatrixType( type ) ) {

			const elements = target.elements;
			for ( const i = 0, l = elements.length; i < l; i ++ ) {

				elements[ i ] = value[ i ];

			}

		} else if ( isVectorType( type ) ) {

			target.fromArray( value );

		} else {

			return value;

		}

	}

}

class StructuralMetadata {

	constructor( definition ) {

		// TODO

	}

	getAccessor( key ) {

	}

}

class PropertyAccessor {

	constructor( definition, data, classes, enums ) {

		this.definition = definition;
		this.classes = classes;
		this.class = classes[ definition.class ];
		this.enums = enums;
		this.data = data;
		this.name = 'name' in definition ? definition.name : null;

	}

	getPropertyNames() {

		return Object.keys( this.class.properties );

	}

	_getPropertyValueType( name ) {

		const classProperty = this.class.properties[ name ];
		const valueType = classProperty.type === 'ENUM' ? this.enums[ classProperty.enumType ].valueType : classProperty.componentType;
		return valueType;


	}
	_enumTypeToNumericType( enumType ) {

		return this.enums[ enumType ].valueType;

	}

	_enumValueToName( enumType, index ) {

		const enumArray = this.enums[ enumType ];
		for ( let i = 0, l = enumArray.length; i < l; i ++ ) {

			const e = enumArray[ i ];
			if ( e.value === index ) {

				return e.name;

			}

		}

	}

}

class PropertyTextureAccessor extends PropertyAccessor {

	constructor( definition, data, classes, enums, geometry ) {

		super( definition, data, classes, enums );

		this.isPropertyTexture = true;
		this.geometry = geometry;

	}

	getPropertyValueAtTexelAsync( ...args ) {

		// TODO

	}

	getPropertyValuesAtTexelAsync( ...args ) {

		// TODO

	}

	getPropertyValueAtTexel( name, triangle, barycoord, target = null ) {

		return this.getPropertyValuesAtTexel( [ name ], triangle, barycoord, target )[ 0 ];

	}

	getPropertyValuesAtTexel( names, triangle, barycoord, target = null ) {

		if ( target = null ) {

			target = [];

		}

		target.length = names.length;
		TextureReadUtility.increaseSizeTo( target.length );

		// get the attribute indices
		const textures = this.data;
		const geometry = this.geometry;
		const indices = getTriangleIndices( geometry, triangle );
		for ( let i = 0, l = names.length; i < l; i ++ ) {

			const texture = textures[ property.index ];
			const name = names[ i ];
			const property = this.definition.properties[ name ];
			if ( ! property ) {

				continue;

			}

			// get the attribute of the target tex coord
			getTexCoord( geometry, property.texCoord, barycoord, indices, _uv );

			// get the target pixel
			getTexelIndices( _uv, texture.image.width, texture.image.height, _pixel );
			_dstPixel.set( i, 0 );

			TextureReadUtility.renderPixelToTarget( texture, _pixel, _dstPixel );

		}

		const buffer = new Float32Array( names.length * 4 );
		if ( this._asyncRead ) {

			return TextureReadUtility
				.readDataAsync( buffer ).then( () => {

					readTextureSampleResults();
					return target;

				} );

		} else {

			TextureReadUtility.readData( buffer );
			readTextureSampleResults();

			return target;

		}

		function readTextureSampleResults() {

			for ( let i = 0, l = names.length; i < l; i ++ ) {

				const name = names[ i ];
				const property = this.definition.properties[ name ];
				const classProperty = this.class.properties[ name ];
				const valueType = this._getPropertyValueType( name );
				const type = classProperty.type;
				if ( ! property ) {

					if ( ! classProperty ) {

						throw new Error( 'PropertyTextureAccessor: Requested property does not exist.' );

					} else {

						target[ i ] = resolveDefault( classProperty.default, type, target );
						continue;

					}

				}

				const { channels } = property;
				const data = channels.map( c => buffer[ c ] );
				const BufferCons = getArrayConstructorFromType( valueType );

				const valueLength = parseInt( valueType.replace( /[^\d]/, '' ) );
				const length = valueLength * ( classProperty.count || 1 );
				const readBuffer = new BufferCons( length );
				new Uint8Array( readBuffer.buffer ).set( data );

				if ( target[ i ] === undefined || target[ i ] === null ) {

					if ( classProperty.array ) {

						target[ i ] = [];

					}

				}

				if ( classProperty.array ) {

					const arr = target[ i ];
					while ( classProperty.count < arr.length ) arr.push( getTypeInstance( type ) );
					arr.length = classProperty.count;

					for ( let j = 0, lj = arr.length; j < lj; lj ++ ) {

						target[ j ] = getDataValue( readBuffer, j * valueLength, type, target[ j ] );

					}

				} else {

					target[ i ] = getDataValue( readBuffer, 0, type );

				}

				// TODO: handle scaling, normalization, and offset of values
				// TODO: handle enums

				if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

					target[ i ] = resolveDefault( classProperty.default, type, target );

				}

			}

		}

	}

	// dispose all of the texture data used
	dispose() {

		this.data.forEach( texture => {

			if ( texture ) {

				texture.dispose();

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

			}

		} );

	}

}

class PropertyAttributeAccessor extends PropertyAccessor {

	constructor( ...args ) {

		super( ...args );

		this.isPropertyAttribute = true;

	}

	getPropertyValue( name, id, target = null ) {

		if ( id >= this.count ) {

			throw new Error( 'PropertyAttributeAccessor: Requested index is outside the range of the table.' );

		}

		// arrays are not supported via attribute accessors

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

		} else {

			target = attribute.getX( id );

			if ( type === 'BOOLEAN' ) {

				target = Boolean( target );

			} else if ( type === 'STRING' ) {

				target = target.toString();

			} else if ( type === 'ENUM' ) {

				target = this._enumValueToName( classProperty.enumType, target );

			}

		}

		// handle the case of no data
		if ( 'noData' in classProperty && isNoDataEqual( target, type, classProperty.noData ) ) {

			target = resolveDefault( classProperty.default, type, target );

		}

		return target;

	}

}

class PropertyTableAccessor extends PropertyAccessor {

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
		// TODO: read data
		// TODO: assume - 1 is for scalar values

		if ( type === 'ENUM' ) {

			target = this._enumValueToName( classProperty.enumType, target );

		} else if ( isNumericType( type ) ) {

			const normalized = getField( classProperty, 'normalized', false );
			const scale = getField( property, 'scale', getField( classProperty, 'scale', 1 ) );
			const offset = getField( property, 'offset', getField( classProperty, 'offset', 0 ) );
			const isFloat = isFloatType( type );

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
					value = value * scale + offset;

				}

				return value;

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
		if ( array && count !== null ) {

			while ( target.length < count ) {

				target.push( getTypeInstance( type ) );

			}

			target.length = count;

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this.getPropertyValueAtIndex( name, id, i, target );

			}

		} else {

			return this.getPropertyValueAtIndex( name, id, - 1, target );

		}

	}

}

// Matrix2 definition since it doesn't exist in three.js
class Matrix2 {

	constructor( n11, n12, n21, n22 ) {

		Matrix2.prototype.isMatrix2 = true;

		this.elements = [

			1, 0,
			0, 1,

		];

		if ( n11 !== undefined ) {

			this.set( n11, n12, n21, n22 );

		}

	}

	set( n11, n12, n21, n22 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 1 ] = n21;
		te[ 2 ] = n12; te[ 3 ] = n22;

		return this;

	}

}
