export function debounce( callback ) {

	let handle = null;
	return () => {

		if ( handle === null ) {

			handle = requestAnimationFrame( () => {

				handle = null;
				callback();

			} );

		}

	};

}
