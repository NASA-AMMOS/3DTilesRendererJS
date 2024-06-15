import { getField, getTypeInstance, isTypeInstance } from './PropertySetAccessor.js';

export function initializeFromProperty( property, target ) {

	if ( property.array ) {

		if ( ! Array.isArray( target ) ) {

			target = new Array( property.count || 0 );

		}

		const value = target;
		for ( let i = 0, l = value.length; i < l; i ++ ) {

			if ( ! isTypeInstance( property.type, value[ i ] ) ) {

				value[ i ] = getTypeInstance( property.type );

			}

		}

	} else {

		if ( ! isTypeInstance( property.type, target ) ) {

			target = getTypeInstance( property.type );

		}

	}

	return target;

}

export function initializeFromClass( classDefinition, target ) {

	const properties = classDefinition.properties;

	// remove unused fields
	for ( const key in target ) {

		if ( ! ( key in properties ) ) {

			delete target[ key ];

		}

	}

	for ( const key in properties ) {

		const prop = properties[ key ];
		target[ key ] = initializeFromProperty( prop, target[ key ] );

	}

}
