class AFManager {

	constructor() {

		// XR session
		this.xrsession = null;

	}

	// Set active XR session
	setXRSession( xrsession ) {

		this.xrsession = xrsession;

	}

	removeXRSession() {

		this.xrsession = null;

	}

	// Request animation frame (defer to XR session if present)
	requestAnimationFrame( cb ) {

		if (!this.xrsession) return window.requestAnimationFrame(cb);

		return this.xrsession.requestAnimationFrame(cb);

	};

	// Cancel animation frame via handle (defer to XR session if present)
	cancelAnimationFrame( handle ) {

		if (!this.xrsession) window.cancelAnimationFrame(handle);

		else this.xrsession.cancelAnimationFrame(handle);

	}

}

export { AFManager };
