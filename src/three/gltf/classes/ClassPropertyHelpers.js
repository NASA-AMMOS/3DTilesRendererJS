import { getTypeInstance, isTypeInstance } from './PropertySetAccessor.js';

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
