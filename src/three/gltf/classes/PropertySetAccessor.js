import { ClassProperty } from './ClassProperty.js';

export * from './Utils.js';

export class PropertySetAccessor {

	constructor( definition, classes = {}, enums = {}, data = null ) {

		this.definition = definition;
		this.class = classes[ definition.class ];
		this.enums = enums;
		this.data = data;
		this.name = 'name' in definition ? definition.name : null;

		const properties = {};
		for ( const key in this.class.properties ) {

			properties[ key ] = new ClassProperty( enums, this.class.properties[ key ], definition.properties[ key ] );

		}

		this.properties = properties;

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

		if ( index === null ) {

			return null;

		}

		const enumArray = this.enums[ enumType ].values;
		for ( let i = 0, l = enumArray.length; i < l; i ++ ) {

			const e = enumArray[ i ];
			if ( e.value === index ) {

				return e.name;

			}

		}

	}

	_convertToEnumNames( enumType, target ) {

		if ( Array.isArray( target ) ) {

			for ( let i = 0, l = target.length; i < l; i ++ ) {

				target[ i ] = this._enumValueToName( enumType, target[ i ] );

			}

		} else {

			target = this._enumValueToName( enumType, target );

		}

		return target;

	}

}
