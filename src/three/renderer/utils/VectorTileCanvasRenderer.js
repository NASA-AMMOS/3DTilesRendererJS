const MVT_EXTENT = 4096;
const DEFAULT_STYLE = { fill: '#cccccc', stroke: 'transparent', strokeWidth: 1, radius: 2, order: 0, visible: true };

export class VectorTileCanvasRenderer {

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
			getStyle = null,
			getX = p => p.x,
			getY = p => p.y,
		} = options;

		this.getStyle = getStyle;
		this.getX = getX;
		this.getY = getY;

		// styles
		this.radius = DEFAULT_STYLE.radius;

		this._invScale = 1;
		this._ctx = null;

	}

	renderToCanvas( vectorTile ) {

		const { _ctx, getStyle } = this;

		for ( const feature of this._getFeatures( vectorTile ) ) {

			const { layerName, properties, geometry, type } = feature;
			const style = getStyle ? getStyle( layerName, properties ) : DEFAULT_STYLE;
			const visible = style?.visible ?? DEFAULT_STYLE.visible;
			if ( ! style || visible === false ) {

				continue;

			}

			this.setStyle( style );

			if ( type === 1 ) {

				this._renderPoints( geometry );

			} else if ( type === 2 ) {

				this._renderLines( geometry );

			} else if ( type === 3 ) {

				this._renderPolygons( geometry );

			}

		}

		_ctx.restore();

	}

	// Sets up the canvas transform and clip for geographic (Y-up, degree) coordinates.
	// tileBoundsDeg and regionBoundsDeg are in the same coordinate space as getX/getY returns.
	setGeographicFrame( ctx, tileBoundsDeg, regionBoundsDeg, width, height ) {

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
		this.fill = style.fill ?? DEFAULT_STYLE.fill;
		this.stroke = style.stroke ?? DEFAULT_STYLE.stroke;
		this.strokeWidth = ( style.strokeWidth ?? DEFAULT_STYLE.strokeWidth ) * _invScale;
		this.radius = ( style.radius ?? DEFAULT_STYLE.radius ) * _invScale;

	}

	// TODO: merge setVectorTileFrame and setGeographicFrame into a single method.

	// Sets up the canvas transform and clip for one MVT tile.
	// tileBounds and regionBounds are normalized [0,1] coordinates, Y increases northward.
	setVectorTileFrame( ctx, tileBounds, regionBounds, width, height ) {

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

	_sortLayers( layerNames ) {

		const { getStyle } = this;

		return [ ...layerNames ].sort( ( a, b ) => {

			if ( getStyle ) {

				const orderA = getStyle( a, null )?.order ?? DEFAULT_STYLE.order;
				const orderB = getStyle( b, null )?.order ?? DEFAULT_STYLE.order;
				if ( orderA !== orderB ) {

					return orderA - orderB;

				}

			}

			return a.localeCompare( b );

		} );

	}

	_getFeatures( vectorTile ) {

		const results = [];
		const layerNames = Object.keys( vectorTile.layers );
		const sortedLayers = this._sortLayers( layerNames );

		for ( const layerName of sortedLayers ) {

			const layer = vectorTile.layers[ layerName ];

			for ( let i = 0; i < layer.length; i ++ ) {

				const feature = layer.feature( i );
				results.push( {
					layerName,
					properties: feature.properties,
					geometry: feature.loadGeometry(),
					type: feature.type,
				} );

			}

		}

		return results;

	}

	_renderPoints( geometry, aspectRatio = 1 ) {

		const { _ctx, radius, getX, getY } = this;
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

		const { _ctx, getX, getY } = this;

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

		const { _ctx, getX, getY } = this;

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
