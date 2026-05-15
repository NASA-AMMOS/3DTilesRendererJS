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

		// Affine transform: MVT tile coords [0, MVT_EXTENT] → canvas pixels.
		// MVT Y increases downward; normalized Y increases northward; canvas Y increases downward.
		const scaleX = ( tMaxX - tMinX ) / MVT_EXTENT / ( rMaxX - rMinX ) * width;
		const scaleY = ( tMaxY - tMinY ) / MVT_EXTENT / ( rMaxY - rMinY ) * height;
		const offsetX = ( tMinX - rMinX ) / ( rMaxX - rMinX ) * width;
		const offsetY = ( 1 - ( tMaxY - rMinY ) / ( rMaxY - rMinY ) ) * height;
		const invScale = 1 / scaleX;

		ctx.save();
		ctx.setTransform( scaleX, 0, 0, scaleY, offsetX, offsetY );

		// Clip to [0, MVT_EXTENT] in tile space — prevents MVT buffer geometry from bleeding
		// into adjacent tiles and causing evenodd fill cancellation at boundaries.
		ctx.beginPath();
		ctx.rect( 0, 0, MVT_EXTENT, MVT_EXTENT );
		ctx.clip();

		for ( const { layerName, geometry, type } of this._getFeatures( vectorTile ) ) {

			const color = this.styler.getColor( layerName, 'css' );
			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			ctx.lineWidth = invScale;

			if ( type === 1 ) {

				renderPoints( geometry, layerName );

			} else if ( type === 2 ) {

				renderLines( geometry );

			} else if ( type === 3 ) {

				renderPolygons( geometry );

			}

		}

		ctx.restore();

		function renderPoints( geometry, layerName ) {

			const radius = ( ( layerName === 'poi' ) ? 3 : 2 ) * invScale;

			for ( const multiPoint of geometry ) {

				for ( const p of multiPoint ) {

					ctx.beginPath();
					ctx.moveTo( p.x + radius, p.y );
					ctx.arc( p.x, p.y, radius, 0, Math.PI * 2 );
					ctx.fill();

				}

			}

		}

		function renderLines( geometry ) {

			ctx.beginPath();

			for ( const ring of geometry ) {

				for ( let k = 0; k < ring.length; k ++ ) {

					if ( k === 0 ) ctx.moveTo( ring[ k ].x, ring[ k ].y );
					else ctx.lineTo( ring[ k ].x, ring[ k ].y );

				}

			}

			ctx.stroke();

		}

		function renderPolygons( geometry ) {

			ctx.beginPath();

			for ( const ring of geometry ) {

				for ( let k = 0; k < ring.length; k ++ ) {

					if ( k === 0 ) ctx.moveTo( ring[ k ].x, ring[ k ].y );
					else ctx.lineTo( ring[ k ].x, ring[ k ].y );

				}

				ctx.closePath();

			}

			ctx.fill( 'evenodd' );
			ctx.stroke();

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

}
