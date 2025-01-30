import { useCallback } from 'react';

export function useMultipleRefs( ...refs ) {

	return useCallback( target => {

		refs.forEach( ref => {

			if ( ref ) {

				if ( typeof ref === 'function' ) {

					ref( target );

				} else {

					ref.current = target;

				}

			}

		} );

	}, refs ); // eslint-disable-line

}
