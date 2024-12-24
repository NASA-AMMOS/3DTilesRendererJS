export class FadeMaterialManager {

	constructor() {

		this._fadeParams = new WeakMap();
		this.fading = 0;

	}

	// Set the fade parameters for the given scene
	setFade( scene, fadeIn, fadeOut ) {

		if ( ! scene ) {

			return;

		}

		const fadeParams = this._fadeParams;
		scene.traverse( child => {

			const material = child.material;
			if ( material ) {

				const params = fadeParams.get( material );
				params.fadeIn.value = fadeIn;
				params.fadeOut.value = fadeOut;

				const fadeInComplete = fadeIn === 0 || fadeIn === 1;
				const fadeOutComplete = fadeOut === 0 || fadeOut === 1;
				const value = Number( ! fadeInComplete || ! fadeOutComplete );
				if ( material.defines.FEATURE_FADE !== value ) {

					this.fading += value === 1 ? 1 : - 1;
					material.defines.FEATURE_FADE = value;
					material.needsUpdate = true;

				}

			}

		} );

	}

	// initialize materials in the object
	prepareScene( scene ) {

		scene.traverse( child => {

			if ( child.material ) {

				this.prepareMaterial( child.material );

			}

		} );

	}

	// delete the object from the fade, reset the material data
	deleteScene( scene ) {

		if ( ! scene ) {

			return;

		}

		const fadeParams = this._fadeParams;
		scene.traverse( child => {

			const material = child.material;
			if ( material ) {

				fadeParams.delete( material );
				material.onBeforeCompile = () => {};
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

}
