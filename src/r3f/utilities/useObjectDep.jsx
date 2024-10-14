import { useRef } from 'react';

// checks if the first level of object key-values are equal
function areObjectsEqual( a, b ) {

	// early check for equivalence
	if ( a === b ) {

		return true;

	}

	// if either of the objects is null or undefined, then perform a simple check
	if ( ! a || ! b ) {

		return a === b;

	}

	// check all keys and values in the first object
	for ( const key in a ) {

		if ( a[ key ] !== b[ key ] ) {

			return false;

		}

	}

	// check all keys and values in the second object
	for ( const key in b ) {

		if ( a[ key ] !== b[ key ] ) {

			return false;

		}

	}

	return true;

}

export function useObjectDep( object ) {

	const ref = useRef();
	if ( ! areObjectsEqual( ref.current, object ) ) {

		ref.current = object;

	}

	return ref.current;

}