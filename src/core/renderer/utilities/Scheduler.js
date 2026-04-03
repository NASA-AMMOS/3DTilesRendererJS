/**
 * Class used within TilesRenderer for scheduling requestAnimationFrame events and
 * toggling between XRSession rAF and window rAF toggles.
 */
class Scheduler {

	static pending = new Map();
	static session = null;

	/**
	 * Sets the active "XRSession" value to use to scheduling rAF callbacks.
	 * @param {XRSession} session
	 */
	static setXRSession( session ) {

		// call "flush" before assigning xr session to ensure callbacks are
		// cancelled on the previous handle
		if ( session !== this.session ) {

			this.flushPending();
			this.session = session;

		}

	}

	/**
	 * Request animation frame (defer to XR session if set)
	 * @param {Function} cb
	 * @returns {number}
	 */
	static requestAnimationFrame( cb ) {

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

	/**
	 * Cancel animation frame via handle (defer to XR session if set)
	 * @param {number} handle
	 */
	static cancelAnimationFrame( handle ) {

		const { pending, session } = this;
		pending.delete( handle );

		if ( ! session ) {

			cancelAnimationFrame( handle );

		} else {

			session.cancelAnimationFrame( handle );

		}

	}


	/**
	 * Flush and complete pending AFs (defer to XR session if set)
	 */
	static flushPending() {

		this.pending.forEach( ( cb, handle ) => {

			cb();
			this.cancelAnimationFrame( handle );

		} );

	}

}

export { Scheduler };
