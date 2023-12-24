import { MathUtils } from 'three';

const { clamp } = MathUtils;
export class FadeManager {

	constructor() {

		this.duration = 250;
		this._lastTick = - 1;
		this._fadeState = new Map();
		this._fadeParams = new WeakMap();
		this.onFadeFinish = () => {};

	}

	// initialize materials in the object
	prepareObject( object ) {

		object.traverse( child => {

			if ( child.material ) {

				this.prepareMaterial( child.material );

			}

		} );

	}

	deleteObject( object ) {

		if ( ! object ) {

			return;

		}

		this._fadeParams.delete( object );
		object.traverse( child => {

			const material = child.material;
			if ( material ) {

				this._fadeParams.delete( material );

			}

		} );

	}

	// initialize the material
	prepareMaterial( material ) {

		const fadeParams = this._fadeParams;
		if ( fadeParams.has( material ) ) {

			return;

		}

		const params = {
			fadeIn: { value: 0 },
			fadeOut: { value: 0 },
		};

		material.defines = {
			FEATURE_FADE: 0,
		};

		material.onBeforeCompile = shader => {

			shader.uniforms = {
				...shader.uniforms,
				...params,
			};

			shader.fragmentShader = shader.fragmentShader
				.replace( /void main\(/, value => /* glsl */`
					#if FEATURE_FADE

					// adapted from https://www.shadertoy.com/view/Mlt3z8
					float bayerDither2x2( vec2 v ) {

						return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );

					}

					float bayerDither4x4( vec2 v ) {

						vec2 P1 = mod( v, 2.0 );
						vec2 P2 = floor( 0.5 * mod( v, 4.0 ) );
						return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );

					}

					uniform float fadeIn;
					uniform float fadeOut;
					#endif

					${ value }
				` )
				.replace( /#include <dithering_fragment>/, value => /* glsl */`

					${ value }

					#if FEATURE_FADE

					float bayerValue = bayerDither4x4( floor( mod( gl_FragCoord.xy, 4.0 ) ) );
					float bayerBins = 16.0;
					float dither = ( 0.5 + bayerValue ) / bayerBins;
					if ( dither >= fadeIn ) {

						discard;

					}

					if ( dither < fadeOut ) {

						discard;

					}

					#endif


				` );


		};

		fadeParams.set( material, params );

	}

	guaranteeState( object ) {

		const fadeState = this._fadeState;
		if ( fadeState.has( object ) ) {

			return false;

		}

		const state = {
			fadeInTarget: 0,
			fadeOutTarget: 0,
			fadeIn: 0,
			fadeOut: 0,
		};

		fadeState.set( object, state );

		const fadeParams = this._fadeParams;
		object.traverse( child => {

			const material = child.material;
			if ( material && fadeParams.has( material ) ) {

				const params = fadeParams.get( material );
				params.fadeIn.value = 0;
				params.fadeOut.value = 0;

			}

		} );

		return true;

	}

	completeFade( object ) {

		const fadeState = this._fadeState;
		if ( ! fadeState.has( object ) ) return;

		fadeState.delete( object );
		object.traverse( child => {

			const material = child.material;
			if ( material && material.defines.FEATURE_FADE !== 0 ) {

				material.defines.FEATURE_FADE = 0;
				material.needsUpdate = true;

			}

		} );

		this.onFadeFinish( object );

	}

	fadeIn( object ) {

		this.guaranteeState( object );

		const state = this._fadeState.get( object );
		state.fadeInTarget = 1;
		state.fadeOutTarget = 0;
		state.fadeOut = 0;

	}

	fadeOut( object ) {

		const noState = this.guaranteeState( object );
		const state = this._fadeState.get( object );
		state.fadeOutTarget = 1;
		if ( noState ) {

			state.fadeInTarget = 1;
			state.fadeIn = 1;

		}

	}

	update() {

		// clamp delta in case duration is really small or 0
		const time = window.performance.now();
		const delta = clamp( ( time - this._lastTick ) / this.duration, 0, 1 );
		this._lastTick = time;

		const fadeState = this._fadeState;
		const fadeParams = this._fadeParams;
		fadeState.forEach( ( state, object ) => {

			// tick the fade values
			const {
				fadeOutTarget,
				fadeInTarget,
			} = state;

			let {
				fadeOut,
				fadeIn,
			} = state;

			const fadeInSign = Math.sign( fadeInTarget - fadeIn );
			fadeIn = clamp( fadeIn + fadeInSign * delta, 0, 1 );

			const fadeOutSign = Math.sign( fadeOutTarget - fadeOut );
			fadeOut = clamp( fadeOut + fadeOutSign * delta, 0, 1 );

			state.fadeIn = fadeIn;
			state.fadeOut = fadeOut;

			// update the material fields
			const defineValue = Number( fadeOut !== fadeOutTarget || fadeIn !== fadeInTarget );
			object.traverse( child => {

				const material = child.material;
				if ( material && fadeParams.has( material ) ) {

					const uniforms = fadeParams.get( material );
					uniforms.fadeIn.value = fadeIn;
					uniforms.fadeOut.value = fadeOut;

					if ( defineValue !== material.defines.FEATURE_FADE ) {

						material.defines.FEATURE_FADE = defineValue;
						material.needsUpdate = true;

					}

				}

			} );

			if ( fadeOut === 1.0 || fadeOut >= fadeIn ) {

				this.completeFade( object );

			}

		} );

	}

}
