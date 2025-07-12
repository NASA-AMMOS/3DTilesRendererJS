import { WebGLRenderTarget, WebGLRenderer, Box2, Vector2, ShaderMaterial, CustomBlending, ZeroFactor, OneFactor } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const _box = /* @__PURE__ */ new Box2();

// Utility for reading sets of individual pixel values from textures
class _TextureReadUtility {

	constructor() {

		this._renderer = new WebGLRenderer();
		this._target = new WebGLRenderTarget( 1, 1 );
		this._texTarget = new WebGLRenderTarget();

		// quad to render just a single pixel from the provided texture
		this._quad = new FullScreenQuad( new ShaderMaterial( {

			blending: CustomBlending,
			blendDst: ZeroFactor,
			blendSrc: OneFactor,

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

	}

	// increases the width of the target render target to support more data
	increaseSizeTo( width ) {

		this._target.setSize( Math.max( this._target.width, width ), 1 );

	}

	// read data from the rendered texture asynchronously
	readDataAsync( buffer ) {

		const { _renderer, _target } = this;
		return _renderer.readRenderTargetPixelsAsync( _target, 0, 0, buffer.length / 4, 1, buffer );

	}

	// read data from the rendered texture
	readData( buffer ) {

		const { _renderer, _target } = this;
		_renderer.readRenderTargetPixels( _target, 0, 0, buffer.length / 4, 1, buffer );

	}

	// render a single pixel from the source at the destination point on the render target
	// takes the texture, pixel to read from, and pixel to render in to
	renderPixelToTarget( texture, pixel, dstPixel ) {

		const { _renderer, _target } = this;

		// copies the pixel directly to the target buffer
		_box.min.copy( pixel );
		_box.max.copy( pixel );
		_box.max.x += 1;
		_box.max.y += 1;
		_renderer.initRenderTarget( _target );
		_renderer.copyTextureToTexture( texture, _target.texture, _box, dstPixel, 0 );

	}

}

// Create a wrapper class to defer instantiation of the WebGLRenderer until it's needed
// See NASA-AMMOS/3DTilesRendererJS#905
export const TextureReadUtility = /* @__PURE__ */ new ( class {

	constructor() {

		let reader = null;
		Object
			.getOwnPropertyNames( _TextureReadUtility.prototype )
			.forEach( key => {

				if ( key !== 'constructor' ) {

					this[ key ] = ( ...args ) => {

						reader = reader || new _TextureReadUtility();
						return reader[ key ]( ...args );

					};

				}

			} );

	}

} )();
