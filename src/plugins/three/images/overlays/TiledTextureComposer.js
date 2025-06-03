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
	draw( texture, span, projection = null, color = 0xffffff, opacity = 1 ) {

		// draw the texture at the given sub range
		const { range, renderer, quad, renderTarget } = this;
		const material = quad.material;
		material.map = texture;
		material.opacity = opacity;
		material.color.set( color );

		// prep for mercator projection
		if ( projection !== null ) {

			material.minCart.set( span[ 0 ], span[ 1 ] );
			material.maxCart.set( span[ 2 ], span[ 3 ] );
			material.isMercator = projection.isMercator;

		} else {

			material.minCart.set( 0, 0 );
			material.maxCart.set( 1, 1 );
			material.isMercator = false;

		}

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

	// color fields
	get color() {

		return this.uniforms.color.value;

	}

	get opacity() {

		return this.uniforms?.opacity.value;

	}

	set opacity( v ) {

		if ( ! this.uniforms ) return;

		this.uniforms.opacity.value = v;

	}

	// the [ - 1, 1 ] NDC ranges to draw the texture at
	get minRange() {

		return this.uniforms.minRange.value;

	}

	get maxRange() {

		return this.uniforms.maxRange.value;

	}

	// the cartographic lat / lon values used for mercator projection adjustments
	set isMercator( v ) {

		this.uniforms.isMercator.value = v ? 1 : 0;

	}

	get isMercator() {

		return this.uniforms.isMercator.value === 1;

	}

	get minCart() {

		return this.uniforms.minCart.value;

	}

	get maxCart() {

		return this.uniforms.maxCart.value;

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
			transparent: true,
			side: DoubleSide,
			uniforms: {
				color: { value: new Color() },
				map: { value: null },

				// the normalized [0, 1] range of the target to draw to
				minRange: { value: new Vector2() },
				maxRange: { value: new Vector2() },

				// the cartographic lat / lon range that the texture spans
				minCart: { value: new Vector2() },
				maxCart: { value: new Vector2() },

				// whether the texture to draw is using mercator projection
				isMercator: { value: 0 },

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

				uniform vec3 color;
				uniform float opacity;
				uniform sampler2D map;
				varying vec2 vUv;

				uniform int isMercator;
				uniform vec2 minRange;
				uniform vec2 maxRange;

				uniform vec2 minCart;
				uniform vec2 maxCart;

				#define PI ${ Math.PI.toFixed( 10 ) }

				// convert the cartographic value to the [ 0, 1 ] range using mercator
				vec2 cartToProjMercator( vec2 cart ) {

					float mercatorN = log( tan( ( PI / 4.0 ) + ( cart.y / 2.0 ) ) );
					vec2 result;
					result.x = ( cart.x + PI ) / ( 2.0 * PI );
					result.y = ( 1.0 / 2.0 ) + ( 1.0 * mercatorN / ( 2.0 * PI ) );
					return result;

				}

				void main() {

					vec2 uv = vUv;
					if ( isMercator == 1 ) {

						// take the point on the image and find the mercator point to sample
						vec2 minProj = cartToProjMercator( minCart );
						vec2 maxProj = cartToProjMercator( maxCart );
						vec2 proj = cartToProjMercator( mix( minCart, maxCart, uv ) );

						float range = maxProj.y - minProj.y;
						float offset = proj.y - minProj.y;
						uv.y = offset / range;

					}

					// sample the texture
					gl_FragColor = texture( map, uv );
					gl_FragColor.rgb *= color;
					gl_FragColor.a *= opacity;

				}

			`,
		} );


	}

}
