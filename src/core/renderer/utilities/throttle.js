// function that rate limits the amount of time a function can be called to once
// per frame, initially queuing a new call for the next frame.
export function throttle( callback, framescheduler ) {

	let handle = null;
	return () => {

		if ( handle === null && framescheduler ) {

			handle = framescheduler.requestAnimationFrame( () => {

				handle = null;
				callback();

			} );

		}

	};

}
