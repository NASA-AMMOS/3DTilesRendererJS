import { ShaderMaterial, MathUtils, Vector2, PlaneGeometry, OrthographicCamera, Mesh, Color } from 'three';

const _camera = /* @__PURE__ */ new OrthographicCamera();
const _color = /* @__PURE__ */ new Color();
export class TiledTextureComposer {

	constructor( renderer ) {

		this.renderer = renderer;
		this.renderTarget = null;
		this.range = [ 0, 0, 1, 1 ];
		this.quad = new Mesh( new PlaneGeometry(), new ComposeTextureMaterial() );

	}

	setRenderTarget( renderTarget, range ) {

		this.renderTarget = renderTarget;
		this.range = [ ...range ];

	}

	draw( texture, span, projection, opacity = 1 ) {

		const { range, renderer, quad, renderTarget } = this;
		const material = quad.material;
		material.map = texture;
		material.opacity = opacity;

		material.minRange.x = MathUtils.mapLinear( span[ 0 ], range[ 0 ], range[ 2 ], - 1, 1 );
		material.minRange.y = MathUtils.mapLinear( span[ 1 ], range[ 1 ], range[ 3 ], - 1, 1 );

		material.maxRange.x = MathUtils.mapLinear( span[ 2 ], range[ 0 ], range[ 2 ], - 1, 1 );
		material.maxRange.y = MathUtils.mapLinear( span[ 3 ], range[ 1 ], range[ 3 ], - 1, 1 );

		const currentRenderTarget = renderer.getRenderTarget();
		const currentAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setRenderTarget( renderTarget );
		renderer.render( quad, _camera );
		renderer.setRenderTarget( currentRenderTarget );
		renderer.autoClear = currentAutoClear;

	}

	clear( color ) {

		const { renderer, renderTarget } = this;
		const currentRenderTarget = renderer.getRenderTarget();
		const currentClearColor = renderer.getClearColor( _color );
		const currentClearAlpha = renderer.getClearAlpha();

		renderer.setClearColor( color, 1 );
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

export class ComposeTextureMaterial extends ShaderMaterial {

	get opacity() {

		return this.uniforms?.opacity.value;

	}

	set opacity( v ) {

		if ( ! this.uniforms ) return;

		this.uniforms.opacity.value = v;

	}

	get minRange() {

		return this.uniforms.minRange.value;

	}

	get maxRange() {

		return this.uniforms.maxRange.value;

	}

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
				minRange: { value: new Vector2() },
				maxRange: { value: new Vector2() },
				opacity: { value: 1 },
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

				uniform float opacity;
				uniform sampler2D map;
				varying vec2 vUv;
				void main() {

					gl_FragColor = texture( map, vUv );
					gl_FragColor.a = opacity;

				}

			`,
		} );


	}

}
