import { MathUtils } from 'three';

// Utility for composing a series of tiled textures together onto a target texture in a given range
export class TiledTextureComposer {

	constructor() {

		this.canvas = null;
		this.context = null;
		this.range = [ 0, 0, 1, 1 ];

	}

	// set the target render texture and the range that represents the full span
	setRenderTarget( renderTarget, range ) {

		this.canvas = renderTarget.image;
		this.context = renderTarget.image.getContext( '2d' );
		this.range = [ ...range ];

	}

	// draw the given texture at the given span with the provided projection
	draw( texture, span ) {

		const { canvas, range, context } = this;
		const { width, height } = canvas;
		const minX = Math.round( MathUtils.mapLinear( span[ 0 ], range[ 0 ], range[ 2 ], 0, width ) );
		const minY = Math.round( MathUtils.mapLinear( span[ 1 ], range[ 1 ], range[ 3 ], 0, height ) );
		const maxX = Math.round( MathUtils.mapLinear( span[ 2 ], range[ 0 ], range[ 2 ], 0, width ) );
		const maxY = Math.round( MathUtils.mapLinear( span[ 3 ], range[ 1 ], range[ 3 ], 0, height ) );
		context.drawImage( texture.image, minX, height - minY, maxX - minX, - maxY + minY );

	}

	// clear the set target
	clear() {

		const { context, canvas } = this;
		context.clearRect( 0, 0, canvas.width, canvas.height );

	}

}
