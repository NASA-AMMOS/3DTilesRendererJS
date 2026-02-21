class FrameScheduler {

	constructor() {

		// XR session
		this.session = null;

		// Pending AFs
		this.pending = new Map();

	}

	// Set active XR session
	// To be called when entering XR
	setXRSession( session ) {

		// call "flush" before assigning xr session to ensure callbacks are
		// cancelled on the previous handle
		if ( session !== this.session ) {

			this.flushPending();
			this.session = session;

		}

	}

	// Request animation frame (defer to XR session if active)
	requestAnimationFrame( cb ) {

		const { session, pending } = this;
		let handle;

		const func = () => {

			pending.delete( handle );
			cb();

		};

		if ( ! session ) {

			handle = requestAnimationFrame( func );

		} else {

			handle = session.requestAnimationFrame( func );

		}

		pending.set( handle, cb );

		return handle;

	}

	// Cancel animation frame via handle (defer to XR session if active)
	cancelAnimationFrame( handle ) {

		const { pending, session } = this;
		pending.delete( handle );

		if ( ! session ) {

			cancelAnimationFrame( handle );

		} else {

			session.cancelAnimationFrame( handle );

		}

	}

	// Flush and complete pending AFs (defer to XR session if active)
	flushPending() {

		this.pending.forEach( ( cb, handle ) => {

			cb();
			this.cancelAnimationFrame( handle );

		} );

	}

}

export { FrameScheduler };
