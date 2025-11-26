const OVERLAY_PARAMS = Symbol( 'OVERLAY_PARAMS' );

// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
export function wrapOverlaysMaterial( material, previousOnBeforeCompile ) {

	// if the material has already been wrapped then return the params
	if ( material[ OVERLAY_PARAMS ] ) {

		return material[ OVERLAY_PARAMS ];

	}

	const params = {
		layerMaps: { value: [] },
		layerInfo: { value: [] },
	};

	material[ OVERLAY_PARAMS ] = params;

	material.defines = {
		...( material.defines || {} ),
		LAYER_COUNT: 0,
	};

	material.onBeforeCompile = shader => {

		if ( previousOnBeforeCompile ) {

			previousOnBeforeCompile( shader );

		}

		shader.uniforms = {
			...shader.uniforms,
			...params,
		};

		shader.vertexShader = shader
			.vertexShader
			.replace( /void main\(\s*\)\s*{/, value => /* glsl */`

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							attribute vec3 layer_uv_UNROLLED_LOOP_INDEX;
							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif


					}
				#pragma unroll_loop_end

				${ value }

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

			` );

		shader.fragmentShader = shader
			.fragmentShader
			.replace( /void main\(/, value => /* glsl */`

				#if LAYER_COUNT != 0
					struct LayerInfo {
						vec3 color;
						float opacity;
					};

					uniform sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerInfo layerInfo[ LAYER_COUNT ];
				#endif

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

				${ value }

			` )
			.replace( /#include <color_fragment>/, value => /* glsl */`

				${ value }

				#if LAYER_COUNT != 0
				{
					vec4 tint;
					vec3 layerUV;
					float layerOpacity;
					float wOpacity;
					float wDelta;
${
	// unroll the loops so we can use unique defines per layer
	new Array( 10 )
		.fill()
		.map( ( _, i ) => /* glsl */`
			#if ${ i } < LAYER_COUNT && LAYER_${ i }_EXISTS
				{
					// set INDEX
					#define INDEX ${ i }

					layerUV = v_layer_uv_${ i };
					tint = texture( layerMaps[ INDEX ], layerUV.xy );

					// discard texture outside 0, 1 on w - offset the stepped value by an epsilon to avoid cases
					// where wDelta is near 0 (eg a flat surface) at the w boundary, resulting in artifacts on some
					// hardware.
					wDelta = max( fwidth( layerUV.z ), 1e-7 );
					wOpacity =
						smoothstep( - wDelta, 0.0, layerUV.z ) *
						smoothstep( 1.0 + wDelta, 1.0, layerUV.z );

					// apply tint & opacity
					tint.rgb *= layerInfo[ INDEX ].color;
					tint.rgba *= layerInfo[ INDEX ].opacity * wOpacity;

					// invert the alpha
					#if LAYER_${ i }_ALPHA_INVERT

						tint.a = 1.0 - tint.a;

					#endif

					// apply the alpha across all existing layers if alpha mask is true
					#if LAYER_${ i }_ALPHA_MASK

						diffuseColor.a *= tint.a;

					#else

						// premultiplied alpha equation
						diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );

					#endif

					// unset INDEX
					#undef INDEX
				}
			#endif

		` )
		.join( ' ' )
}

				}
				#endif
			` );

	};

	return params;

}
