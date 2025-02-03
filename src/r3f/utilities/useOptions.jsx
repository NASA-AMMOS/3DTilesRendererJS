import { useEffect } from 'react';
import { useObjectDep } from './useObjectDep.js';

// return true if the given key is for registering an event
function isEventName( key ) {

	return /^on/g.test( key );

}

// returns the event name to register for the given key
function getEventName( key ) {

	return key
		.replace( /^on/, '' )
		.replace( /[a-z][A-Z]/g, match => `${ match[ 0 ] }-${ match[ 1 ] }` )
		.toLowerCase();

}

// returns a dash-separated key as a list of tokens
function getPath( key ) {

	return key.split( '-' );

}

// gets the value from the object at the given path
function getValueAtPath( object, path ) {

	let curr = object;
	const tokens = [ ...path ];
	while ( tokens.length !== 0 ) {

		const key = tokens.shift();
		curr = curr[ key ];

	}

	return curr;

}

// sets the value of the object at the given path
function setValueAtPath( object, path, value ) {

	const tokens = [ ...path ];
	const finalKey = tokens.pop();
	getValueAtPath( object, tokens )[ finalKey ] = value;

}

// Recursively assigns a set of options to an object, interpreting dashes as periods
export function useDeepOptions( target, options, shallow = false ) {

	// assign options recursively
	useEffect( () => {

		if ( target === null ) {

			return;

		}

		const previousState = {};
		for ( const key in options ) {

			if ( isEventName( key ) ) {

				target.addEventListener( getEventName( key ), options[ key ] );

			} else {

				const path = shallow ? [ key ] : getPath( key );
				previousState[ key ] = getValueAtPath( target, path );
				setValueAtPath( target, path, options[ key ] );

			}

		}

		return () => {

			for ( const key in options ) {

				if ( isEventName( key ) ) {

					target.removeEventListener( getEventName( key ), options[ key ] );

				}

			}

			for ( const key in options ) {

				const path = shallow ? [ key ] : getPath( key );
				setValueAtPath( target, path, options[ key ] );

			}

		};

	}, [ target, useObjectDep( options ) ] ); // eslint-disable-line

}

// Assigns a set of options to an object shallowly, interpreting dashes as periods
export function useShallowOptions( instance, options ) {

	useDeepOptions( instance, options, true );

}
