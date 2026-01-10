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

		this.xrsession = xrsession;

		this.flushPending();

	}

	// Remove XR session (exit)
	// To be called when exiting XR
	removeXRSession() {

		this.xrsession = null;

		this.flushPending();

	}

	// Request animation frame (defer to XR session if active)
	requestAnimationFrame( cb ) {

		let handle;

		// Standard AF
		if ( ! this.xrsession ) {

			handle = window.requestAnimationFrame( ()=>{

				this.pending.delete( handle );

				cb();

			} );

			this.pending.set( handle, cb );

			return handle;

		}
		// XR session
		else {

			handle = this.xrsession.requestAnimationFrame( ()=>{

				this.pending.delete( handle );

				cb();

			} );

			this.pending.set( handle, cb );

			return handle;

		}

	}

	// Cancel animation frame via handle (defer to XR session if active)
	cancelAnimationFrame( handle ) {

    	this.pending.delete( handle );

		if ( ! this.xrsession ) {

			window.cancelAnimationFrame( handle );

		}

		else {

			this.xrsession.cancelAnimationFrame( handle );

		}

	}

	// Cancel all pending AFs
	cancelAllPending() {

		this.pending.forEach( ( cb, handle )=>{

    		this.cancelAnimationFrame( handle );

		} );

	}

	// Flush and complete pending AFs (defer to XR session if active)
	flushPending() {

		this.pending.forEach( ( cb, handle )=>{

			if ( this.xrsession ) {

				this.xrsession.cancelAnimationFrame( handle );

				cb();

			}
			else {

				window.cancelAnimationFrame( handle );

				cb();

			}

		} );

	}

}

export { FrameScheduler };
