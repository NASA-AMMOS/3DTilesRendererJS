class FrameScheduler {

	constructor() {

		// XR session
		this.xrsession = null;

		// Pending AFs
		this.pending = new Map();

	}

	// Set active XR session
	// To be called when entering XR
	setXRSession( xrsession ) {

		// call "flush" before assigning xr session to ensure callbacks are
		// cancelled on the previous handle
		if ( xrsession !== this.xrsession ) {

			this.flushPending();
			this.xrsession = xrsession;

		}

	}

	// Request animation frame (defer to XR session if active)
	requestAnimationFrame( cb ) {

		const { xrsession, pending } = this;
		let handle;

		const func = () => {

			pending.delete( handle );
			cb();

		};

		if ( ! xrsession ) {

			handle = requestAnimationFrame( func );

		} else {

			handle = xrsession.requestAnimationFrame( func );

		}

		pending.set( handle, cb );

		return handle;

	}

	// Cancel animation frame via handle (defer to XR session if active)
	cancelAnimationFrame( handle ) {

		const { pending, xrsession } = this;
		pending.delete( handle );

		if ( ! xrsession ) {

			cancelAnimationFrame( handle );

		} else {

			xrsession.cancelAnimationFrame( handle );

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
