const MVT_EXTENT = 4096;
export const DEFAULT_STYLE = { fill: '#cccccc', stroke: 'transparent', strokeWidth: 1, radius: 2, order: 0, visible: true };

export class VectorShapeCanvasRenderer {

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
		} = options;

		this.getX = getX;
		this.getY = getY;

		// styles
		this.radius = DEFAULT_STYLE.radius;
		this.visible = true;

		this._invScale = 1;
		this._ctx = null;

	}

	// Sets up the canvas transform and clip for geographic (Y-up, degree) coordinates.
	// tileBoundsDeg and regionBoundsDeg are in the same coordinate space as getX/getY returns.
	setGeographicFrame( ctx, tileBoundsDeg, regionBoundsDeg, width, height ) {

		if ( ctx === this._ctx ) ctx.restore();

		const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBoundsDeg;
		const [ rMinX, rMinY, rMaxX, rMaxY ] = regionBoundsDeg;

		// Geographic Y increases northward; canvas Y increases downward — negate scaleY.
		const scaleX = width / ( rMaxX - rMinX );
		const scaleY = - height / ( rMaxY - rMinY );
		const offsetX = - rMinX * scaleX;
		const offsetY = rMaxY * height / ( rMaxY - rMinY );

		ctx.save();
		ctx.setTransform( scaleX, 0, 0, scaleY, offsetX, offsetY );

		ctx.beginPath();
		ctx.rect( tMinX, tMinY, tMaxX - tMinX, tMaxY - tMinY );
		ctx.clip();

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
		this.visible = style?.visible ?? DEFAULT_STYLE.visible;

	}

	// TODO: merge setVectorTileFrame and setGeographicFrame into a single method.

	// Sets up the canvas transform and clip for one MVT tile.
	// tileBounds and regionBounds are normalized [0,1] coordinates, Y increases northward.
	setVectorTileFrame( ctx, tileBounds, regionBounds, width, height ) {

		if ( ctx === this._ctx ) ctx.restore();

		const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
		const [ rMinX, rMinY, rMaxX, rMaxY ] = regionBounds;

		// Affine transform: MVT tile coords [0, MVT_EXTENT] → canvas pixels.
		// MVT Y increases downward; normalized Y increases northward; canvas Y increases downward.
		const scaleX = ( tMaxX - tMinX ) / MVT_EXTENT / ( rMaxX - rMinX ) * width;
		const scaleY = ( tMaxY - tMinY ) / MVT_EXTENT / ( rMaxY - rMinY ) * height;
		const offsetX = ( tMinX - rMinX ) / ( rMaxX - rMinX ) * width;
		const offsetY = ( 1 - ( tMaxY - rMinY ) / ( rMaxY - rMinY ) ) * height;

		ctx.save();
		ctx.setTransform( scaleX, 0, 0, scaleY, offsetX, offsetY );

		// Clip to [0, MVT_EXTENT] in tile space — prevents MVT buffer geometry from bleeding
		// into adjacent tiles and causing evenodd fill cancellation at boundaries.
		ctx.beginPath();
		ctx.rect( 0, 0, MVT_EXTENT, MVT_EXTENT );
		ctx.clip();

		this._ctx = ctx;
		this._invScale = 1 / scaleX;

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
