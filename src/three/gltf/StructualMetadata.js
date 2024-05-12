import {
	Vector2,
	Vector3,
	Vector4,
	Matrix3,
	Matrix4,
} from 'three';

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

	constructor( ...args ) {

		super( ...args );

		this.isPropertyTexture = true;

	}

	getPropertyValueAtTexel( name, x, y, target = null ) {

		return this.getPropertyValuesAtTexel( [ name ], x, y, target );

	}

	getPropertyValuesAtTexel( name, x, y, target = null ) {

		// TODO: can arrays be handled here

	}

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

		const property = this.definition.properties[ name ];
		const classProperty = this.class.properties[ name ];
		const type = classProperty.type;
		if ( ! property ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyAttributeAccessor: Requested property does not exist in the table class.' );

			} else {

				return resolveDefault( classProperty.default, type, target );

			}

		}

		if ( classProperty.array ) {

			throw new Error( 'PropertyAttributeAccessor: Array values are supported.' );

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
		// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
		// discard it
		if ( classProperty.noData && isNoDataEqual( target, type, classProperty.noData ) ) {

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
		const type = classProperty.type;
		if ( ! property ) {

			if ( ! classProperty ) {

				throw new Error( 'PropertyTableAccessor: Requested property does not exist in the table class.' );

			} else {

				return resolveDefault( classProperty.default, type, target );

			}

		}

		if ( target === null ) {

			target = getTypeInstance( type );

		}

		const bufferView = this.data[ property.values ];
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
		// TODO: there are cases where we create a Matrix or Vector, for example, and immediately
		// discard it
		if ( classProperty.noData && isNoDataEqual( target, type, classProperty.noData ) ) {

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


class Matrix2 {

	constructor( n11, n12, n21, n22 ) {

		Matrix2.prototype.isMatrix2 = true;

		this.elements = [

			1, 0,
			0, 1,

		];

	}

	set( n11, n12, n21, n22 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 1 ] = n21;
		te[ 2 ] = n12; te[ 3 ] = n22;

		return this;

	}

}
