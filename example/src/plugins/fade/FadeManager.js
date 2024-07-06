import { MathUtils } from 'three';

const { clamp } = MathUtils;
export class FadeManager {

	constructor() {

		this.duration = 250;
		this.fadeCount = 0;
		this._lastTick = - 1;
		this._fadeState = new Map();
		this._fadeParams = new WeakMap();
		this.onFadeComplete = null;
		this.onFadeStart = null;
		this.onFadeSetComplete = null;
		this.onFadeSetStart = null;

	}

	// initialize materials in the object
	prepareObject( object ) {

		object.traverse( child => {

			if ( child.material ) {

				this.prepareMaterial( child.material );

			}

		} );

	}

	// delete the object from the fade, reset the material data
	deleteObject( object ) {

		if ( ! object ) {

			return;

		}

		this.completeFade( object );

		const fadeParams = this._fadeParams;
		object.traverse( child => {

			const material = child.material;
			if ( material ) {

				fadeParams.delete( material );
				material.onBeforeCompile = null;
				material.needsUpdate = true;

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

	// Ensure we're storing a fade timer for the provided object
	// Returns whether a new state had to be added
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

	// Force the fade to complete in the direction it is already trending
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

		// fire events
		this.fadeCount --;

		if ( this.onFadeComplete ) {

			this.onFadeComplete( object );

		}

		if ( this.fadeCount === 0 && this.onFadeSetComplete ) {

			this.onFadeSetComplete();

		}

	}

	completeAllFades() {

		this._fadeState.forEach( ( value, key ) => {

			this.completeFade( key );

		} );

	}

	forEachObject( cb ) {

		this._fadeState.forEach( ( info, scene ) => cb( scene ) );

	}

	// Fade the object in
	fadeIn( object ) {

		const noState = this.guaranteeState( object );
		const state = this._fadeState.get( object );
		state.fadeInTarget = 1;
		state.fadeOutTarget = 0;
		state.fadeOut = 0;

		// Fire events
		if ( noState ) {

			this.fadeCount ++;
			if ( this.fadeCount === 1 && this.onFadeSetStart ) {

				this.onFadeSetStart();

			}

			if ( this.onFadeStart ) {

				this.onFadeStart( object );

			}

		}

	}

	// Fade the object out
	fadeOut( object ) {

		const noState = this.guaranteeState( object );
		const state = this._fadeState.get( object );
		state.fadeOutTarget = 1;

		// Fire events and initialize state
		if ( noState ) {

			state.fadeInTarget = 1;
			state.fadeIn = 1;

			this.fadeCount ++;
			if ( this.fadeCount === 1 && this.onFadeSetStart ) {

				this.onFadeSetStart();

			}

			if ( this.onFadeStart ) {

				this.onFadeStart( object );

			}

		}

	}

	// Tick the fade timer for each actively fading object
	update() {

		// clamp delta in case duration is really small or 0
		const time = window.performance.now();
		if ( this._lastTick === - 1 ) {

			this._lastTick = time;

		}

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

			// Check if the fade in and fade out animations are complete
			const fadeOutComplete = fadeOut === 1 || fadeOut === 0;
			const fadeInComplete = fadeIn === 1 || fadeIn === 0;

			// If they are or the fade out animation is further along than the
			// fade in animation then mark the fade as completed for this tile
			if ( ( fadeOutComplete && fadeInComplete ) || fadeOut >= fadeIn ) {

				this.completeFade( object );

			}

		} );

	}

}
