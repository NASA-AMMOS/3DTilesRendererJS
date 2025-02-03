import { useEffect } from 'react';

// assign a give target to the set of refs
export function useApplyRefs( target, ...refs ) {

	useEffect( () => {

		refs.forEach( ref => {

			if ( ref ) {

				if ( ref instanceof Function ) {

					ref( target );

				} else {

					ref.current = target;

				}

			}

		} );

	}, [ target, ...refs ] ); // eslint-disable-line

}
