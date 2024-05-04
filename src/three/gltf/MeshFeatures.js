import { Vector2 } from 'three';

const _canvas = document.createElement( 'canvas', {
	alpha: true,
	colorSpace: 'srgb',
	willReadFrequently: true,
} );
_canvas.height = 1;
_canvas.width = 1;

const _ctx = _canvas.getContext( '2d' );
_ctx.imageSmoothingEnabled = false;

const _uv = new Vector2();
const _vec2_0 = new Vector2();
const _vec2_1 = new Vector2();
const _vec2_2 = new Vector2();

function getTextureCoordAttribute( geometry, index ) {

	if ( index === 0 ) {

		return geometry.getAttribute( 'uv' );

	} else {

		return geometry.getAttribute( `uv${ index }` );

	}

}

export class MeshFeatures {

	constructor( geometry, textures, data ) {

		this.geometry = geometry;
		this.textures = textures;
		this.data = data;

	}

	getFeatures( triangle, barycoord ) {

		const { geometry, textures, data } = this;
		const { featureIds } = data;
		const result = new Array( featureIds.length ).fill( null );

		// prep the canvas width
		_canvas.width = Math.max( _canvas.width, data.featureIds.length );

		for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

			// get the attribute indices
			let i0 = 3 * triangle;
			let i1 = 3 * triangle + 1;
			let i2 = 3 * triangle + 2;
			if ( geometry.index ) {

				i0 = geometry.index.getX( i0 );
				i1 = geometry.index.getX( i1 );
				i2 = geometry.index.getX( i2 );

			}

			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			if ( 'texture' in featureId ) {

				// get the interpolated uv value
				const uv = getTextureCoordAttribute( geometry, featureId.texture.texCoord );
				_vec2_0.fromBufferAttribute( uv, i0 );
				_vec2_1.fromBufferAttribute( uv, i1 );
				_vec2_2.fromBufferAttribute( uv, i2 );

				_uv
					.setScalar( 0 )
					.addScaledVector( _vec2_0, barycoord.x )
					.addScaledVector( _vec2_1, barycoord.y )
					.addScaledVector( _vec2_2, barycoord.z );

				// draw the image
				const image = textures[ featureId.texture.index ].image;
				const { width, height } = image;

				const fx = _uv.x - Math.floor( _uv.x );
				const fy = _uv.y - Math.floor( _uv.y );
				const px = ( fx * width ) % width;
				const py = ( fy * height ) % height;

				_ctx.drawImage( image, px, py, 1, 1, i, 0, 1, 1 );

			} else if ( 'attribute' in featureId ) {

				const attr = geometry.getAttribute( `_feature_id${ featureId.attribute }` );
				const v0 = attr.getX( i0 );
				const v1 = attr.getX( i1 );
				const v2 = attr.getX( i2 );

				// TODO: do we need to interpolate here?
				const value = v0 * barycoord.x + v1 * barycoord.y + v2 * barycoord.z;
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			} else {

				// TODO: is this only for points?
				const i0 = 3 * triangle;
				const i1 = 3 * triangle + 1;
				const i2 = 3 * triangle + 2;
				const value = i0 * barycoord.x + i1 * barycoord.y + i2 * barycoord.z;
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			}

		}

		// TODO: make sure this works for alpha and color space does not
		const imageData = _ctx.getImageData( 0, 0, featureIds.length, 1 );

		// get data based on the texture informatino
		for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			if ( 'texture' in featureId ) {

				const { channels } = featureId.texture;
				let value = 0;

				channels.forEach( ( c, index ) => {

					const byte = imageData.data[ 4 * i + c ];
					const shift = index * 8;
					value = value | ( byte << shift );

				} );

				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			}

		}

		return result;

	}

	getFeatureInfo() {

		return this.data.featureIds.map( info => {

			return {
				featureCount: info.featureCount,
				label: info.label || null,
				propertyTable: info.propertyTable || null,
			};

		} );

	}

	toJSON() {

		return this.data;

	}

}
