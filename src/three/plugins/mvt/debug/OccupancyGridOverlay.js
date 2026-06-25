// Debug overlay that draws a screen occupation grid as a fixed, full-viewport canvas pinned
// over the renderer. Occupied cells are red, free cells green.
// Takes the screen occupancy manager as a reference for rendering the results
export class OccupancyGridOverlay {

	constructor( occupancyManager ) {

		this.enabled = false;
		this.canvas = null;
		this.occupancyManager = occupancyManager;

	}

	update() {

		const { occupancyManager, enabled } = this;

		// dispose of the canvas if disabled
		if ( ! enabled ) {

			this.dispose();
			return;

		}

		// initialize the canvas if enabled
		if ( this.canvas === null ) {

			const canvas = document.createElement( 'canvas' );
			canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;opacity:0.5;';
			document.body.appendChild( canvas );
			this.canvas = canvas;

		}

		const { canvas } = this;
		const { cells, size, resolution, buffer } = occupancyManager;
		const dpr = window.devicePixelRatio;
		const bufferX = resolution.width * buffer;
		const bufferY = resolution.height * buffer;
		const cols = Math.ceil( ( resolution.width + 2 * bufferX ) / size );
		const rows = Math.ceil( ( resolution.height + 2 * bufferY ) / size );

		canvas.width = Math.round( dpr * ( resolution.width + 2 * bufferX ) );
		canvas.height = Math.round( dpr * ( resolution.height + 2 * bufferY ) );
		canvas.style.width = `${ resolution.width + 2 * bufferX }px`;
		canvas.style.height = `${ resolution.height + 2 * bufferY }px`;
		canvas.style.left = `${ - bufferX }px`;
		canvas.style.top = `${ - bufferY }px`;

		const drawSize = size * dpr;
		const ctx = canvas.getContext( '2d' );
		ctx.clearRect( 0, 0, canvas.width, canvas.height );
		for ( let cy = 0; cy < rows; cy ++ ) {

			for ( let cx = 0; cx < cols; cx ++ ) {

				const occupied = cells[ cy * cols + cx ] !== 0;
				ctx.fillStyle = occupied ? 'rgba( 255, 80, 80, 0.6 )' : 'rgba( 80, 255, 80, 0.15 )';
				ctx.fillRect( cx * drawSize + 0.5, cy * drawSize + 0.5, drawSize - 1, drawSize - 1 );
				ctx.strokeStyle = occupied ? 'rgba( 255, 80, 80, 1 )' : 'rgba( 80, 255, 80, 0.25 )';
				ctx.lineWidth = 1;
				ctx.strokeRect( cx * drawSize + 0.5, cy * drawSize + 0.5, drawSize - 1, drawSize - 1 );

			}

		}

	}

	dispose() {

		if ( this.canvas !== null ) {

			this.canvas.remove();
			this.canvas = null;

		}

	}

}
