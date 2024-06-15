import { getTypeInstance, isTypeInstance } from './PropertySetAccessor.js';

export function initializeFromProperty( prop, target ) {

	if ( prop.array ) {

		if ( ! Array.isArray( target ) ) {

			target = new Array( prop.count || 0 );

		}

		const value = target;
		for ( let i = 0, l = value.length; i < l; i ++ ) {

			if ( ! isTypeInstance( prop.type, value[ i ] ) ) {

				value[ i ] = getTypeInstance( prop.type );

			}

		}

	} else {

		if ( ! isTypeInstance( prop.type, target ) ) {

			target = getTypeInstance( prop.type );

		}

	}

	return target;

}

export function initializeFromClass( definition, target ) {

	const properties = definition.properties;

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
