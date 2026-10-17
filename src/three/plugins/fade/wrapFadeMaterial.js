// Adjusts the provided material to support fading in and out using a bayer pattern. Providing a "previous"

import { Discard, Fn, If, output, screenCoordinate, uniform } from 'three/tsl';

// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
const FADE_PARAMS = Symbol( 'FADE_PARAMS' );
export function wrapFadeMaterial( material, previousOnBeforeCompile ) {

	// if the material has already been wrapped then return the params
	if ( material[ FADE_PARAMS ] ) {

		return material[ FADE_PARAMS ];

	}

	const params = {
		fadeIn: { value: 0 },
		fadeOut: { value: 0 },
		fadeTexture: { value: null },
	};

	material[ FADE_PARAMS ] = params;

	if ( material.isNodeMaterial ) {

		modifyNodeMaterial( material, params );

	} else {

		modifyMaterial( material, params, previousOnBeforeCompile );

	}

	return params;

}

function modifyMaterial( material, params, previousOnBeforeCompile ) {

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

}

// adapted from https://www.shadertoy.com/view/Mlt3z8
const bayerDither2x2 = Fn( ( [ v ] ) => {

	return v.y.mul( 3 ).add( v.x.mul( 2 ) ).mod( 4 );

} ).setLayout( {
	name: 'bayerDither2x2',
	type: 'float',
	inputs: [ { name: 'v', type: 'vec2' } ]
} );

const bayerDither4x4 = Fn( ( [ v ] ) => {

	const P1 = v.mod( 2 );
	const P2 = v.mod( 4 ).mul( 0.5 ).floor();
	return bayerDither2x2( P1 ).mul( 4 ).add( bayerDither2x2( P2 ) );

} ).setLayout( {
	name: 'bayerDither4x4',
	type: 'float',
	inputs: [ { name: 'v', type: 'vec2' } ]
} );

// Define shared uniforms for fadeIn/fadeOut so that "outputNode" can be cached.
const fadeIn = uniform( 0 ).onObjectUpdate( ( { material } ) => material.params.fadeIn.value );
const fadeOut = uniform( 0 ).onObjectUpdate( ( { material } ) => material.params.fadeOut.value );

const outputNode = Fn( () => {

	const bayerValue = bayerDither4x4( screenCoordinate.xy.mod( 4 ).floor() );
	const bayerBins = 16;
	const dither = bayerValue.add( 0.5 ).div( bayerBins );

	If( dither.greaterThanEqual( fadeIn ), () => {

		Discard();

	} );

	If( dither.lessThan( fadeOut ), () => {

		Discard();

	} );

	return output;

} )();

function modifyNodeMaterial( material, params ) {

	material.params = params;

	let FEATURE_FADE = 0;

	material.defines = {

		get FEATURE_FADE() {

			return FEATURE_FADE;

		},

		set FEATURE_FADE( value ) {

			if ( value != FEATURE_FADE ) {

				FEATURE_FADE = value;
				material.outputNode = value ? outputNode : null;

			}

		}

	};

}
