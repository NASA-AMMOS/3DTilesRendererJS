import { CanvasTexture, SRGBColorSpace, Color } from 'three';
import { XYZImageSource } from './XYZImageSource.js';
import { MVTLoaderBase } from '../../../../core/renderer/loaders/MVTLoaderBase.js';
import { LAYER_COLORS } from '../../../renderer/utils/layerColors.js';

const _color = new Color();

export class MVTImageSource extends XYZImageSource {

	constructor( options = {} ) {

		super( options );

		this.loader = new MVTLoaderBase();
		this.filter = options.filter || ( () => true );
		this.tileDimension = options.tileDimension || 512;

		this._styles = {};
		const colorsToSet = Object.assign( {}, LAYER_COLORS, options.styles || {} );
		for ( const key in colorsToSet ) {

			_color.set( colorsToSet[ key ] );
			this._styles[ key ] = _color.getStyle();

		}

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

	async processBufferToTexture( buffer ) {

		const { vectorTile } = await this.loader.parse( buffer );

		const canvas = this._createCanvas( this.tileDimension, this.tileDimension );
		const ctx = canvas.getContext( '2d' );

		const scale = this.tileDimension / 4096;

		// Draw Order
		const layerOrder = [
			'landuse', 'park', 'water', 'waterway',
			'transportation', 'road', 'building',
			'admin', 'poi', 'place_label'
		];

		const layersToDraw = Object.keys( vectorTile.layers ).sort( ( a, b ) => {

			let idxA = layerOrder.indexOf( a );
			let idxB = layerOrder.indexOf( b );
			if ( idxA === - 1 ) idxA = 0;
			if ( idxB === - 1 ) idxB = 0;
			return idxA - idxB;

		} );

		for ( const layerName of layersToDraw ) {

			const layer = vectorTile.layers[ layerName ];
			const color = this._styles[ layerName ] || this._styles[ 'default' ];

			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;

			for ( let i = 0; i < layer.length; i ++ ) {

				const feature = layer.feature( i );

				if ( ! this.filter( feature, layerName ) ) continue;

				const geometry = feature.loadGeometry();
				const type = feature.type;

				ctx.beginPath();

				// --- TYPE 1: POINTS (POIs & LABELS) ---
				if ( type === 1 ) {

					const isLabelLayer = ( layerName === 'place_label' );

					// 1. Setup Text Styles if this is a label layer
					// if ( isLabelLayer ) {

					// 	ctx.fillStyle = '#ffffff'; // White text
					// 	ctx.font = '12px sans-serif'; // Adjust size/font as needed
					// 	ctx.textAlign = 'center';
					// 	ctx.textBaseline = 'middle';

					// 	// Optional: Add a stroke/shadow so text is readable on busy backgrounds
					// 	ctx.strokeStyle = '#000000';
					// 	ctx.lineWidth = 3;

					// }

					for ( const multiPoint of geometry ) {

						for ( const p of multiPoint ) {

							const x = p.x * scale;
							const y = p.y * scale;

							if ( isLabelLayer ) {

								// 2. Render Text for places
								// "name" is the standard property key for labels in MVT
								// const labelText = feature.properties.name;

								// Simple collision check (optional/rudimentary):
								// if ( labelText ) {

								// 	ctx.strokeText( labelText, x, y );
								// 	ctx.fillText( labelText, x, y );

								// }

							} else {

								// 3. Render Dots for standard POIs
								const radius = ( layerName === 'poi' ) ? 3 : 2;

								ctx.beginPath();
								ctx.moveTo( x + radius, y );
								ctx.arc( x, y, radius, 0, Math.PI * 2 );
								ctx.fillStyle = color;
								ctx.fill();

							}

						}

					}

				} else if ( type === 2 ) {

					// --- TYPE 2: LINES ---

					for ( const ring of geometry ) {

						for ( let k = 0; k < ring.length; k ++ ) {

							const p = ring[ k ];
							if ( k === 0 ) ctx.moveTo( p.x * scale, p.y * scale );
							else ctx.lineTo( p.x * scale, p.y * scale );

						}

					}

					ctx.stroke();

				} else if ( type === 3 ) {

					// --- TYPE 3: POLYGONS ---

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

		}

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		return tex;

	} catch( err ) {

		if ( ! signal.aborted ) {

			console.error( '[MVTImageSource] Error:', err );

		}

		return this._createEmptyTexture();

	}

	_createEmptyTexture() {

		// Use helper
		const canvas = this._createCanvas( this.tileDimension, this.tileDimension );

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		return tex;

	}


}
