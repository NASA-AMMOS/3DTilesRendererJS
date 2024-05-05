import { ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderTarget, WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const _renderer = new WebGLRenderer();
const _quad = new FullScreenQuad( new ShaderMaterial( {
	uniforms: {

		map: { value: null },
		pixel: { value: new Vector2() }

	},

	vertexShader: /* glsl */`
		void main() {

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}
	`,

	fragmentShader: /* glsl */`
		uniform sampler2D map;
		uniform ivec2 pixel;

		void main() {

			gl_FragColor = texelFetch( map, pixel, 0 );

		}
	`,

} ) );

const _uv = new Vector2();
const _vec2_0 = new Vector2();
const _vec2_1 = new Vector2();
const _vec2_2 = new Vector2();
const _currentScissor = new Vector4();
const _pixel = new Vector2();
const _dstPixel = new Vector2();
const _target = new WebGLRenderTarget();

function getTextureCoordAttribute( geometry, index ) {

	if ( index === 0 ) {

		return geometry.getAttribute( 'uv' );

	} else {

		return geometry.getAttribute( `uv${ index }` );

	}

}

function renderPixelToTarget( texture, pixel, dstPixel, target ) {

	_quad.material.uniforms.map.value = texture;
	_quad.material.uniforms.pixel.value.copy( pixel );

	const currentTarget = _renderer.getRenderTarget();
	const currentScissorTest = _renderer.getScissorTest();
	_renderer.getScissor( _currentScissor );

	_renderer.setScissorTest( true );
	_renderer.setScissor( dstPixel.x, dstPixel.y, 1, 1 );

	_renderer.setRenderTarget( target );
	_quad.render( _renderer );

	_renderer.setScissorTest( currentScissorTest );
	_renderer.setScissor( _currentScissor );
	_renderer.setRenderTarget( currentTarget );

	texture.dispose();

}

export class MeshFeatures {

	constructor( geometry, textures, data ) {

		this.geometry = geometry;
		this.textures = textures;
		this.data = data;

	}

	getFeaturesAsync( triangle, barycoord ) {

		// TODO: handle async read back to avoid blocking

	}

	// getFeaturesAsync( triangle, barycoord ) {

	// 		TODO: handle async read back to avoid blocking
	// 		TODO: requires async read back

	// }

	getFeatures( triangle, barycoord, ) {

		const { geometry, textures, data } = this;
		const { featureIds } = data;
		const result = new Array( featureIds.length ).fill( null );

		// prep the canvas width
		_target.setSize( Math.max( _target.width, data.featureIds.length ), 1 );

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
				const px = Math.floor( ( fx * width ) % width );
				const py = Math.floor( ( fy * height ) % height );

				_pixel.set( px, py );
				_dstPixel.set( i, 0 );

				renderPixelToTarget( textures[ featureId.texture.index ], _pixel, _dstPixel, _target );

			} else if ( 'attribute' in featureId ) {

				const attr = geometry.getAttribute( `_feature_id_${ featureId.attribute }` );
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

		const buffer = new Uint8Array( _target.width * 4 );
		_renderer.readRenderTargetPixels( _target, 0, 0, _target.width, 1, buffer );

		// get data based on the texture information
		for ( let i = 0, l = featureIds.length; i < l; i ++ ) {

			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			if ( 'texture' in featureId ) {

				const { channels } = featureId.texture;
				let value = 0;

				channels.forEach( ( c, index ) => {

					const byte = buffer[ 4 * i + c ];
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

	dispose() {

		this.textures.forEach( texture => {

			texture.dispose();

			if ( texture.image instanceof ImageBitmap ) {

				texture.image.close();

			}

		} );

	}

}
