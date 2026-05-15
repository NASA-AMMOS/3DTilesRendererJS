const MVT_EXTENT = 4096;

export class VectorTileCanvasRenderer {

	constructor( styler ) {

		this.styler = styler;

	}

	// Render features from one MVT tile onto an existing canvas context.
	// tileBounds and regionBounds are normalized [0,1] coordinates, Y increases northward.
	renderToCanvas( ctx, vectorTile, tileBounds, regionBounds, width, height ) {

		const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
		const [ rMinX, rMinY, rMaxX, rMaxY ] = regionBounds;

		// Project an MVT tile-local point (px, py ∈ [0, 4096]) into canvas pixel space.
		// MVT Y increases downward; normalized Y increases northward; canvas Y increases downward.
		const projectPoint = ( px, py ) => {

			const normX = tMinX + ( px / MVT_EXTENT ) * ( tMaxX - tMinX );
			const normY = tMaxY - ( py / MVT_EXTENT ) * ( tMaxY - tMinY );
			const canvasX = Math.round( ( normX - rMinX ) / ( rMaxX - rMinX ) * width );
			const canvasY = Math.round( ( 1 - ( normY - rMinY ) / ( rMaxY - rMinY ) ) * height );
			return [ canvasX, canvasY ];

		};

		for ( const { layerName, geometry, type } of this._getFeatures( vectorTile ) ) {

			const color = this.styler.getColor( layerName, 'css' );
			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;

			if ( type === 1 ) {

				this._renderPoints( ctx, geometry, layerName, projectPoint );

			} else if ( type === 2 ) {

				this._renderLines( ctx, geometry, projectPoint );

			} else if ( type === 3 ) {

				this._renderPolygons( ctx, geometry, projectPoint );

			}

		}

	}

	_getFeatures( vectorTile ) {

		const results = [];
		const layerNames = Object.keys( vectorTile.layers );
		const sortedLayers = this.styler.sortLayers( layerNames );

		for ( const layerName of sortedLayers ) {

			const layer = vectorTile.layers[ layerName ];

			for ( let i = 0; i < layer.length; i ++ ) {

				const feature = layer.feature( i );

				if ( this.styler.shouldIncludeFeature( feature, layerName ) ) {

					results.push( {
						layerName,
						geometry: feature.loadGeometry(),
						type: feature.type,
					} );

				}

			}

		}

		return results;

	}

	_renderPoints( ctx, geometry, layerName, projectPoint ) {

		for ( const multiPoint of geometry ) {

			for ( const p of multiPoint ) {

				const [ x, y ] = projectPoint( p.x, p.y );
				const radius = ( layerName === 'poi' ) ? 3 : 2;

				ctx.beginPath();
				ctx.moveTo( x + radius, y );
				ctx.arc( x, y, radius, 0, Math.PI * 2 );
				ctx.fill();

			}

		}

	}

	_renderLines( ctx, geometry, projectPoint ) {

		ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				const [ x, y ] = projectPoint( ring[ k ].x, ring[ k ].y );
				if ( k === 0 ) ctx.moveTo( x, y );
				else ctx.lineTo( x, y );

			}

		}

		ctx.stroke();

	}

	_renderPolygons( ctx, geometry, projectPoint ) {

		ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				const [ x, y ] = projectPoint( ring[ k ].x, ring[ k ].y );
				if ( k === 0 ) ctx.moveTo( x, y );
				else ctx.lineTo( x, y );

			}

			ctx.closePath();

		}

		ctx.fill( 'evenodd' );
		ctx.stroke();

	}

}
