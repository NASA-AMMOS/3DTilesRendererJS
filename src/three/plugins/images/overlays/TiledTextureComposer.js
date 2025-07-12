import { ShaderMaterial, MathUtils, Vector2, PlaneGeometry, OrthographicCamera, Mesh, Color, DoubleSide } from 'three';

const _camera = /* @__PURE__ */ new OrthographicCamera();
const _color = /* @__PURE__ */ new Color();

// Utility for composing a series of tiled textures together onto a target texture in a given range
export class TiledTextureComposer {

	constructor( renderer ) {

		this.renderer = renderer;
		this.renderTarget = null;
		this.range = [ 0, 0, 1, 1 ];
		this.quad = new Mesh( new PlaneGeometry(), new ComposeTextureMaterial() );

	}

	// set the target render texture and the range that represents the full span
	setRenderTarget( renderTarget, range ) {

		this.renderTarget = renderTarget;
		this.range = [ ...range ];

	}

	// draw the given texture at the given span with the provided projection
	draw( texture, span ) {

		// draw the texture at the given sub range
		const { range, renderer, quad, renderTarget } = this;
		const material = quad.material;
		material.map = texture;

		// map the range to draw the texture to
		material.minRange.x = MathUtils.mapLinear( span[ 0 ], range[ 0 ], range[ 2 ], - 1, 1 );
		material.minRange.y = MathUtils.mapLinear( span[ 1 ], range[ 1 ], range[ 3 ], - 1, 1 );

		material.maxRange.x = MathUtils.mapLinear( span[ 2 ], range[ 0 ], range[ 2 ], - 1, 1 );
		material.maxRange.y = MathUtils.mapLinear( span[ 3 ], range[ 1 ], range[ 3 ], - 1, 1 );

		// draw the texture
		const currentRenderTarget = renderer.getRenderTarget();
		const currentAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setRenderTarget( renderTarget );
		renderer.render( quad, _camera );
		renderer.setRenderTarget( currentRenderTarget );
		renderer.autoClear = currentAutoClear;

		material.map = null;

	}

	// clear the set target
	clear( color, alpha = 1 ) {

		// clear the texture
		const { renderer, renderTarget } = this;
		const currentRenderTarget = renderer.getRenderTarget();
		const currentClearColor = renderer.getClearColor( _color );
		const currentClearAlpha = renderer.getClearAlpha();

		renderer.setClearColor( color, alpha );
		renderer.setRenderTarget( renderTarget );
		renderer.clear();

		renderer.setRenderTarget( currentRenderTarget );
		renderer.setClearColor( currentClearColor, currentClearAlpha );

	}

	dispose() {

		this.quad.material.dispose();
		this.quad.geometry.dispose();

	}

}

// Draws the given texture with no depth testing at the given bounds defined by "minRange" and "maxRange"
class ComposeTextureMaterial extends ShaderMaterial {

	// the [ - 1, 1 ] NDC ranges to draw the texture at
	get minRange() {

		return this.uniforms.minRange.value;

	}

	get maxRange() {

		return this.uniforms.maxRange.value;

	}

	// access the map being drawn
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
			transparent: false,
			side: DoubleSide,
			premultipliedAlpha: true,
			uniforms: {
				map: { value: null },

				// the normalized [0, 1] range of the target to draw to
				minRange: { value: new Vector2() },
				maxRange: { value: new Vector2() },
			},

			vertexShader: /* glsl */`

				uniform vec2 minRange;
				uniform vec2 maxRange;
				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = vec4( mix( minRange, maxRange, uv ), 0, 1 );

				}

			`,

			fragmentShader: /* glsl */`

				uniform sampler2D map;
				uniform vec2 minRange;
				uniform vec2 maxRange;
				varying vec2 vUv;

				void main() {

					// sample the texture
					gl_FragColor = texture( map, vUv );
					#include <premultiplied_alpha_fragment>

				}

			`,
		} );


	}

}
