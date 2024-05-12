import { WebGLRenderTarget, WebGLRenderer, Box2, Vector2, Vector4, ShaderMaterial, REVISION, FloatType } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const REVISION_165 = parseInt( REVISION ) >= 165;
const _box = /* @__PURE__ */ new Box2();
const _currentScissor = /* @__PURE__ */ new Vector4();
const _pos = /* @__PURE__ */ new Vector2();

export const TextureReadUtility = new ( class {

	constructor() {

		this._renderer = new WebGLRenderer();
		this._target = new WebGLRenderTarget( 1, 1 );
		this._texTarget = new WebGLRenderTarget();
		this._quad = new FullScreenQuad( new ShaderMaterial( {
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

	increaseSizeTo( width ) {

		this._target.setSize( Math.max( this._target.width, width ), 1 );

	}

	readDataAsync( buffer ) {

		const { _renderer, _target } = this;
		if ( REVISION_165 ) {

			return _renderer.readRenderTargetPixelsAsync( _target, 0, 0, buffer.length / 4, 1, buffer );

		} else {

			return Promise.resolve( () => this.readData( buffer ) );

		}

	}

	readData( buffer ) {

		const { _renderer, _target } = this;
		_renderer.readRenderTargetPixels( _target, 0, 0, buffer.length / 4, 1, buffer );

	}

	// render a single pixel from the source at the destination point on the
	// render target
	renderPixelToTarget( texture, pixel, dstPixel ) {

		const { _quad, _renderer, _target, _texTarget } = this;

		if ( REVISION_165 ) {

			_box.min.copy( pixel );
			_box.max.copy( pixel );
			_box.max.x += 1;
			_box.max.y += 1;
			_renderer.initRenderTarget( _target );
			_renderer.copyTextureToTexture( texture, _target.texture, _box, dstPixel, 0 );

		} else {

			// save state
			const currentAutoClear = _renderer.autoClear;
			const currentTarget = _renderer.getRenderTarget();
			const currentScissorTest = _renderer.getScissorTest();
			_renderer.getScissor( _currentScissor );

			// initialize the render target
			_texTarget.setSize( texture.image.width, texture.image.height );
			_renderer.setRenderTarget( _texTarget );

			// render the data
			_pos.set( 0, 0 );
			_renderer.copyTextureToTexture( _pos, texture, _texTarget.texture );

			_quad.material.uniforms.map.value = _texTarget.texture;
			_quad.material.uniforms.pixel.value.copy( pixel );

			// render
			_renderer.setScissorTest( true );
			_renderer.setScissor( dstPixel.x, dstPixel.y, 1, 1 );
			_renderer.autoClear = false;

			_renderer.setRenderTarget( _target );
			_quad.render( _renderer );

			// reset state
			_renderer.setScissorTest( currentScissorTest );
			_renderer.setScissor( _currentScissor );
			_renderer.setRenderTarget( currentTarget );
			_renderer.autoClear = currentAutoClear;

			// remove the memory
			_texTarget.dispose();

		}

	}

} )();
