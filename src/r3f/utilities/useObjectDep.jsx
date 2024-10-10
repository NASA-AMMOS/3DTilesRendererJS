import { useRef } from 'react';

function areObjectsEqual( a, b ) {

	if ( a === b ) {

		return true;

	}

	if ( Boolean( a ) !== Boolean( b ) ) {

		return false;

	}

	for ( const key in a ) {

		if ( a[ key ] !== b[ key ] ) {

			return false;

		}

	}

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
