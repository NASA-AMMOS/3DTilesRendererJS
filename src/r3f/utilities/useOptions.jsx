import { useEffect } from 'react';

// returns a sorted dependency array from an object
export function getDepsArray( object ) {

	if ( ! object ) {

		return [];

	}

	return Object.entries( object )
		.sort( ( a, b ) => a[ 0 ] > b[ 0 ] ? 1 : - 1 )
		.flatMap( item => item );

}

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

// TODO: should we save previous state? Basic r3f components don't and it keeps handles to memory around
export function useDeepOptions( target, options ) {

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

				const path = getPath( key );
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

				const path = getPath( key );
				setValueAtPath( target, path, options[ key ] );

			}

		};

	}, [ target, ...getDepsArray( options ) ] );

}

export function useShallowOptions( instance, options ) {

	// assigns any provided options to the plugin
	useEffect( () => {

		if ( instance === null ) {

			return;

		}

		const previousState = {};
		for ( const key in options ) {

			if ( key in instance ) {

				previousState[ key ] = instance[ key ];
				instance[ key ] = options[ key ];

			}

		}

		return () => {

			for ( const key in previousState ) {

				instance[ key ] = previousState[ key ];

			}

		};

	}, [ instance, ...getDepsArray( options ) ] );

}
