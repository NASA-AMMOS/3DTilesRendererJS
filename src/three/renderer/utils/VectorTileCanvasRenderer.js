const MVT_EXTENT = 4096;

export class VectorTileCanvasRenderer {

	constructor( options = {} ) {

		const {
			styler = null,
			getX = p => p.x,
			getY = p => p.y,
		} = options;

		this.styler = styler;
		this._getX = getX;
		this._getY = getY;

	}

	renderToCanvas( vectorTile ) {

		const { _ctx, _invScale } = this;

		for ( const { layerName, properties, geometry, type } of this._getFeatures( vectorTile ) ) {

			const style = this.styler.getStyle( layerName, properties );
			if ( ! style || style.visible === false ) continue;

			_ctx.fillStyle = style.fill ?? 'transparent';
			_ctx.strokeStyle = style.stroke ?? 'transparent';
			_ctx.lineWidth = ( style.strokeWidth ?? 1 ) * _invScale;

			if ( type === 1 ) {

				this._renderPoints( geometry, style.radius ?? 2 );

			} else if ( type === 2 ) {

				this._renderLines( geometry );

			} else if ( type === 3 ) {

				this._renderPolygons( geometry );

			}

		}

		_ctx.restore();

	}

	// Sets up the canvas transform and clip for one MVT tile.
	// tileBounds and regionBounds are normalized [0,1] coordinates, Y increases northward.
	setFrame( ctx, tileBounds, regionBounds, width, height ) {

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

	_getFeatures( vectorTile ) {

		const results = [];
		const layerNames = Object.keys( vectorTile.layers );
		const sortedLayers = this.styler.sortLayers( layerNames );

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

	_renderPoints( geometry, radius ) {

		const { _ctx, _invScale, _getX, _getY } = this;
		const scaledRadius = radius * _invScale;

		for ( const multiPoint of geometry ) {

			for ( const p of multiPoint ) {

				const x = _getX( p ), y = _getY( p );
				_ctx.beginPath();
				_ctx.moveTo( x + scaledRadius, y );
				_ctx.arc( x, y, scaledRadius, 0, Math.PI * 2 );
				_ctx.fill();

			}

		}

	}

	_renderLines( geometry ) {

		const { _ctx, _getX, _getY } = this;

		_ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				if ( k === 0 ) _ctx.moveTo( _getX( ring[ k ] ), _getY( ring[ k ] ) );
				else _ctx.lineTo( _getX( ring[ k ] ), _getY( ring[ k ] ) );

			}

		}

		_ctx.stroke();

	}

	_renderPolygons( geometry ) {

		const { _ctx, _getX, _getY } = this;

		_ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				if ( k === 0 ) _ctx.moveTo( _getX( ring[ k ] ), _getY( ring[ k ] ) );
				else _ctx.lineTo( _getX( ring[ k ] ), _getY( ring[ k ] ) );

			}

			_ctx.closePath();

		}

		_ctx.fill( 'evenodd' );
		_ctx.stroke();

	}

}
