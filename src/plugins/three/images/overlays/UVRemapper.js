import { BufferGeometry, BufferAttribute, OrthographicCamera, Mesh, ShaderMaterial, Color } from 'three';

// Class for converting a texture from one UV set up to a target one
const _camera = /* @__PURE__ */new OrthographicCamera();
export class UVRemapper {

	constructor( renderer ) {

		this.renderer = renderer;
		this.renderTarget = null;
		this.quad = new Mesh( new BufferGeometry(), new RemapMaterial() );

	}

	setRenderTarget( renderTarget ) {

		this.renderTarget = renderTarget;

	}

	setUVs( fromUv, toUv, index ) {

		const { geometry } = this.quad;

		this.quad.frustumCulled = false;

		geometry.dispose();
		geometry.setAttribute( 'fromUv', ensureBufferAttribute( fromUv ) );
		geometry.setAttribute( 'toUv', ensureBufferAttribute( toUv ) );
		geometry.setIndex( index );

	}

	draw( texture ) {

		const { renderer, quad, renderTarget } = this;
		const material = quad.material;
		material.map = texture;

		const currentRenderTarget = renderer.getRenderTarget();
		const currentAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setRenderTarget( renderTarget );
		renderer.render( quad, _camera );
		renderer.setRenderTarget( currentRenderTarget );
		renderer.autoClear = currentAutoClear;

	}

	dispose() {

		this.quad.material.dispose();
		this.quad.geometry.dispose();

	}

}

// Class that converts texture using "fromUv" and "toUv".
class RemapMaterial extends ShaderMaterial {

	get map() {

		return this.uniforms.map.value;

	}

	set map( v ) {

		this.uniforms.map.value = v;

	}

	constructor() {

		super( {
			depthWrite: false,
			depthTest: false,
			transparent: true,
			uniforms: {
				map: { value: null },
			},

			vertexShader: /* glsl */`

				attribute vec2 fromUv;
				attribute vec2 toUv;
				varying vec2 vUv;

				void main() {

					vUv = fromUv;
					gl_Position = vec4( mix( vec2( - 1 ), vec2( 1 ), toUv ), 0, 1 );

				}

			`,

			fragmentShader: /* glsl */`

				uniform sampler2D map;
				varying vec2 vUv;
				void main() {

					gl_FragColor = texture( map, vUv );

				}

			`,
		} );

	}

}

// Convert the buffer to a UV buffer attribute
function ensureBufferAttribute( buffer ) {

	if ( buffer instanceof BufferAttribute ) {

		return buffer;

	} else if ( buffer instanceof Float32Array ) {

		return new BufferAttribute( buffer, 2, false );

	} else if ( Array.isArray( buffer ) ) {

		return new BufferAttribute( new Float32Array( buffer ), 2, false );

	} else {

		return new BufferAttribute( buffer, 2, true );

	}

}
