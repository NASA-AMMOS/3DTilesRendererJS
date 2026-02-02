import { CanvasTexture, SRGBColorSpace } from 'three';

const MVT_EXTENT = 4096;

export class VectorTileCanvasRenderer {

	constructor( styler, options = {} ) {

		this.styler = styler;
		this.tileDimension = options.tileDimension || 512;

	}

	render( vectorTile ) {

		const canvas = this._createCanvas( this.tileDimension, this.tileDimension );
		const ctx = canvas.getContext( '2d' );
		const scale = this.tileDimension / MVT_EXTENT;

		for ( const { layerName, geometry, type } of this._getFeatures( vectorTile ) ) {

			const color = this.styler.getColor( layerName, 'css' );
			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;

			if ( type === 1 ) {

				this._renderPoints( ctx, geometry, layerName, scale );

			} else if ( type === 2 ) {

				this._renderLines( ctx, geometry, scale );

			} else if ( type === 3 ) {

				this._renderPolygons( ctx, geometry, scale );

			}

		}

		return this._createTexture( canvas );

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

	_createCanvas( width, height ) {

		if ( typeof OffscreenCanvas !== 'undefined' ) {

			return new OffscreenCanvas( width, height );

		} else {

			const canvas = document.createElement( 'canvas' );
			canvas.width = width;
			canvas.height = height;
			return canvas;

		}

	}

	_createTexture( canvas ) {

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		return tex;

	}

	_renderPoints( ctx, geometry, layerName, scale ) {

		const isLabelLayer = ( layerName === 'place_label' );

		for ( const multiPoint of geometry ) {

			for ( const p of multiPoint ) {

				const x = p.x * scale;
				const y = p.y * scale;

				if ( ! isLabelLayer ) {

					const radius = ( layerName === 'poi' ) ? 3 : 2;

					ctx.beginPath();
					ctx.moveTo( x + radius, y );
					ctx.arc( x, y, radius, 0, Math.PI * 2 );
					ctx.fill();

				}

			}

		}

	}

	_renderLines( ctx, geometry, scale ) {

		ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				const p = ring[ k ];
				if ( k === 0 ) ctx.moveTo( p.x * scale, p.y * scale );
				else ctx.lineTo( p.x * scale, p.y * scale );

			}

		}

		ctx.stroke();

	}

	_renderPolygons( ctx, geometry, scale ) {

		ctx.beginPath();

		for ( const ring of geometry ) {

			for ( let k = 0; k < ring.length; k ++ ) {

				const p = ring[ k ];
				if ( k === 0 ) ctx.moveTo( p.x * scale, p.y * scale );
				else ctx.lineTo( p.x * scale, p.y * scale );

			}

			ctx.closePath();

		}

		ctx.fill();

	}

}
