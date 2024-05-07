import { ShaderMaterial, Vector2, Vector4, WebGLRenderTarget, WebGLRenderer, REVISION, Box2 } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// renderer and quad for rendering a single pixel
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
const _currentScissor = new Vector4();
const _pixel = new Vector2();
const _dstPixel = new Vector2();
const _target = new WebGLRenderTarget();
const _box = new Box2();

// retrieve the appropriate UV attribute based on the texcoord index
function getTextureCoordAttribute( geometry, index ) {

	if ( index === 0 ) {

		return geometry.getAttribute( 'uv' );

	} else {

		return geometry.getAttribute( `uv${ index }` );

	}

}

// render a single pixel from the source at the destination point on the
// render target
function renderPixelToTarget( texture, pixel, dstPixel, target ) {

	if ( REVISION >= 165 ) {

		_box.min.copy( pixel );
		_box.max.copy( pixel );
		_box.max.x += 1;
		_box.max.y += 1;
		_renderer.copyTextureToTexture( _box, dstPixel, texture, target, 0 );

	} else {

		// set up the pixel quad
		_quad.material.uniforms.map.value = texture;
		_quad.material.uniforms.pixel.value.copy( pixel );

		// save state
		const currentTarget = _renderer.getRenderTarget();
		const currentScissorTest = _renderer.getScissorTest();
		_renderer.getScissor( _currentScissor );

		// render
		_renderer.setScissorTest( true );
		_renderer.setScissor( dstPixel.x, dstPixel.y, 1, 1 );

		_renderer.setRenderTarget( target );
		_quad.render( _renderer );

		// reset state
		_renderer.setScissorTest( currentScissorTest );
		_renderer.setScissor( _currentScissor );
		_renderer.setRenderTarget( currentTarget );

		// remove the texture
		texture.dispose();

	}

}

function getMaxBarycoordIndex( barycoord ) {

	if ( barycoord.x > barycoord.y && barycoord.x > barycoord.z ) {

		return 0;

	} else if ( barycoord.y > barycoord.z ) {

		return 1;

	} else {

		return 2;

	}

}

export class MeshFeatures {

	constructor( geometry, textures, data ) {

		this.geometry = geometry;
		this.textures = textures;
		this.data = data;
		this._asyncRead = false;

	}

	getTextures() {

		return this.textures;

	}

	// performs texture data read back asynchronously
	getFeaturesAsync( ...args ) {

		if ( REVISION >= 165 ) {

			this._asyncRead = true;
			const result = this.getFeatures( ...args );
			this._asyncRead = false;
			return result;

		} else {

			return queueMicrotask( () => {

				return this.getFeatures( ...args );

			} );

		}

	}

	// returns all features for the given point on the given triangle
	getFeatures( triangle, barycoord ) {

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

			// the feature id from the closest point is returned
			const featureId = featureIds[ i ];
			const nullFeatureId = 'nullFeatureId' in featureId ? featureId.nullFeatureId : null;
			const closestIndex = [ i0, i1, i2 ][ getMaxBarycoordIndex( barycoord ) ];
			if ( 'texture' in featureId ) {

				const uv = getTextureCoordAttribute( geometry, featureId.texture.texCoord );
				_uv.fromBufferAttribute( uv, closestIndex );

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
				const value = attr.getX( closestIndex );
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			} else {

				// TODO: Is this supposed to index based on index buffer or vertex list
				const value = closestIndex;
				if ( value !== nullFeatureId ) {

					result[ i ] = value;

				}

			}

		}

		// read the buffer data
		const buffer = new Uint8Array( _target.width * 4 );
		if ( this._asyncRead ) {

			return _renderer
				.readRenderTargetPixelsAsync( _target, 0, 0, _target.width, 1, buffer )
				.then( () => {

					readTextureSampleResults();
					return result;

				} );

		} else {

			_renderer.readRenderTargetPixels( _target, 0, 0, _target.width, 1, buffer );
			readTextureSampleResults();

			return result;

		}

		function readTextureSampleResults() {

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

		}

	}

	// returns a minimal set of info for each feature
	getFeatureInfo() {

		return this.data.featureIds.map( info => {

			return {
				label: null,
				propertyTable: null,
				...info
			};

		} );

	}

	// dispose all of the data used
	dispose() {

		this.textures.forEach( texture => {

			texture.dispose();

			if ( texture.image instanceof ImageBitmap ) {

				texture.image.close();

			}

		} );

	}

}
