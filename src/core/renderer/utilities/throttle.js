// function that rate limits the amount of time a function can be called to once
// per frame, initially queuing a new call for the next frame.
export function throttle( callback, frameScheduler ) {

	let handle = null;
	return () => {

		if ( handle === null && frameScheduler ) {

			handle = frameScheduler.requestAnimationFrame( () => {

				handle = null;
				callback();

			} );

		}

	};

}
