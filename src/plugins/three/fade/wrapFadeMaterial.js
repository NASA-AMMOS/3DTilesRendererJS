// Adjusts the provided material to support fading in and out using a bayer pattern. Providing a "previous"
// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
export function wrapFadeMaterial( material, previousOnBeforeCompile ) {

	const params = {
		fadeIn: { value: 0 },
		fadeOut: { value: 0 },
		fadeTexture: { value: null },
	};

	material.defines = {
		...( material.defines || {} ),
		FEATURE_FADE: 0,
	};

	material.onBeforeCompile = shader => {

		if ( previousOnBeforeCompile ) {

			previousOnBeforeCompile( shader );

		}

		shader.uniforms = {
			...shader.uniforms,
			...params,
		};

		shader.vertexShader = shader.vertexShader
			.replace(
				/void\s+main\(\)\s+{/,
				value => /* glsl */`
					#ifdef USE_BATCHING_FRAG

					varying float vBatchId;

					#endif

					${ value }

						#ifdef USE_BATCHING_FRAG

						// add 0.5 to the value to avoid floating error that may cause flickering
						vBatchId = getIndirectIndex( gl_DrawID ) + 0.5;

						#endif
				`
			);

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

				// the USE_BATCHING define is not available in fragment shaders
				#ifdef USE_BATCHING_FRAG

				// functions for reading the fade state of a given batch id
				uniform sampler2D fadeTexture;
				varying float vBatchId;
				vec2 getFadeValues( const in float i ) {

					int size = textureSize( fadeTexture, 0 ).x;
					int j = int( i );
					int x = j % size;
					int y = j / size;
					return texelFetch( fadeTexture, ivec2( x, y ), 0 ).rg;

				}

				#else

				uniform float fadeIn;
				uniform float fadeOut;

				#endif

				#endif

				${ value }
			` )
			.replace( /#include <dithering_fragment>/, value => /* glsl */`

				${ value }

				#if FEATURE_FADE

				#ifdef USE_BATCHING_FRAG

				vec2 fadeValues = getFadeValues( vBatchId );
				float fadeIn = fadeValues.r;
				float fadeOut = fadeValues.g;

				#endif

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

	return params;

}
