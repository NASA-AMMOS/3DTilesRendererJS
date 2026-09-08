/**
 * @typedef {Object} VectorTileStyle
 * @property {string} [fill='#cccccc'] CSS fill color.
 * @property {string} [stroke='transparent'] CSS stroke color.
 * @property {number} [strokeWidth=1] Stroke width in pixels.
 * @property {number} [radius=2] Point radius in pixels.
 * @property {number} [order=0] Layer draw order; lower values are drawn first.
 * @property {boolean} [visible=true] Whether the feature is rendered.
 */


const DEFAULT_STYLE = Object.freeze( {
	fill: '#cccccc',
	stroke: 'transparent',
	strokeWidth: 1,
	radius: 2,
	order: 0,
	visible: true,
} );

export class VectorShapeCanvasRenderer {

	static get DEFAULT_STYLE() {

		return DEFAULT_STYLE;

	}

	get fill() {

		return this._ctx.fillStyle;

	}

	set fill( v ) {

		this._ctx.fillStyle = v;

	}

	get stroke() {

		return this._ctx.strokeStyle;

	}

	set stroke( v ) {

		this._ctx.strokeStyle = v;

	}

	get strokeWidth() {

		return this._ctx.lineWidth;

	}

	set strokeWidth( v ) {

		this._ctx.lineWidth = v;

	}

	constructor( options = {} ) {

		const {
			getX = p => p.x,
			getY = p => p.y,
			flipY = false,
			tileExtent = null,
		} = options;

		this.getX = getX;
		this.getY = getY;

		// flipY: true for Y-up coordinate systems (geographic degrees).
		// tileExtent: fixed local-space size of each tile (e.g. 4096 for MVT).
		//   null means the tile's local space spans [tMinX..tMaxX] / [tMinY..tMaxY] directly.
		this.flipY = flipY;
		this.tileExtent = tileExtent;

		// styles
		this.radius = DEFAULT_STYLE.radius;
		this.visible = true;

		this._invScale = 1;
		this._ctx = null;

	}

	// Sets up the canvas transform and clip for a tile.
	// tileBounds and regionBounds are in the same coordinate space as getX/getY returns.
	setFrame( ctx, tileBounds, regionBounds ) {

		ctx.restore();

		const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
		const [ rMinX, rMinY, rMaxX, rMaxY ] = regionBounds;
		const { width, height } = ctx.canvas;
		const { flipY, tileExtent } = this;

		// Tile span in local coordinate space: either a fixed extent (e.g. 4096 for MVT)
		// or the tile's own span in source coords (for geographic).
		const spanX = tileExtent ?? ( tMaxX - tMinX );
		const spanY = tileExtent ?? ( tMaxY - tMinY );

		// Round all four tile edges to integer pixel positions so adjacent clip rects share
		// the exact same boundary pixel — preventing sub-pixel gaps or overlaps at seams.
		const tileLeft = Math.round( width * ( tMinX - rMinX ) / ( rMaxX - rMinX ) );
		const tileRight = Math.round( width * ( tMaxX - rMinX ) / ( rMaxX - rMinX ) );
		const tileTop = Math.round( height * ( rMaxY - tMaxY ) / ( rMaxY - rMinY ) );
		const tileBottom = Math.round( height * ( rMaxY - tMinY ) / ( rMaxY - rMinY ) );

		// Derive scale from rounded pixel dimensions so geometry fills exactly the rounded clip rect.
		const scaleX = ( tileRight - tileLeft ) / spanX;
		const scaleY = ( flipY ? - 1 : 1 ) * ( tileBottom - tileTop ) / spanY;

		// Tile-local coordinate at the tile's canvas corner.
		// Fixed-extent tiles (e.g. MVT) start at (0, 0); geographic tiles start at the tile bounds corner.
		// For Y-up (flipY) the canvas top corresponds to tMaxY, not tMinY.
		const localOriginX = tileExtent ? 0 : tMinX;
		const localOriginY = tileExtent ? 0 : ( flipY ? tMaxY : tMinY );
		const offsetX = tileLeft - localOriginX * scaleX;
		const offsetY = tileTop - localOriginY * scaleY;

		ctx.save();

		ctx.setTransform( scaleX, 0, 0, scaleY, offsetX, offsetY );

		ctx.beginPath();
		ctx.rect( localOriginX, tileExtent ? 0 : tMinY, spanX, spanY );
		ctx.clip();

		ctx.clearRect( localOriginX, tileExtent ? 0 : tMinY, spanX, spanY );

		this._ctx = ctx;
		this._invScale = 1 / scaleX;

	}

	// Applies a style object (as returned by getStyle) to the current canvas context.
	setStyle( style ) {

		const { _invScale } = this;
		this.fill = style?.fill ?? DEFAULT_STYLE.fill;
		this.stroke = style?.stroke ?? DEFAULT_STYLE.stroke;
		this.strokeWidth = ( style?.strokeWidth ?? DEFAULT_STYLE.strokeWidth ) * _invScale;
		this.radius = ( style?.radius ?? DEFAULT_STYLE.radius ) * _invScale;
		this.visible = style ? style?.visible ?? DEFAULT_STYLE.visible : false;

	}

	_renderPoints( geometry, aspectRatio = 1 ) {

		const { _ctx, radius, getX, getY, visible } = this;
		if ( ! visible ) {

			return;

		}

		for ( const multiPoint of geometry ) {

			for ( const p of multiPoint ) {

				const x = getX( p ), y = getY( p );
				_ctx.beginPath();
				_ctx.ellipse( x, y, radius / aspectRatio, radius, 0, 0, Math.PI * 2 );
				_ctx.fill();

			}

		}

		_ctx.stroke();

	}

	_renderLines( geometry ) {

		const { _ctx, getX, getY, visible } = this;
		if ( ! visible ) {

			return;

		}

		if ( geometry instanceof Path2D ) {

			_ctx.stroke( geometry );
			return;

		}

		_ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				if ( k === 0 ) _ctx.moveTo( getX( ring[ k ] ), getY( ring[ k ] ) );
				else _ctx.lineTo( getX( ring[ k ] ), getY( ring[ k ] ) );

			}

		}

		_ctx.stroke();

	}

	_renderPolygons( geometry ) {

		const { _ctx, getX, getY, visible } = this;
		if ( ! visible ) {

			return;

		}

		if ( geometry instanceof Path2D ) {

			_ctx.fill( geometry, 'evenodd' );
			_ctx.stroke( geometry );
			return;

		}

		_ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				if ( k === 0 ) _ctx.moveTo( getX( ring[ k ] ), getY( ring[ k ] ) );
				else _ctx.lineTo( getX( ring[ k ] ), getY( ring[ k ] ) );

			}

			_ctx.closePath();

		}

		_ctx.fill( 'evenodd' );
		_ctx.stroke();

	}

}
