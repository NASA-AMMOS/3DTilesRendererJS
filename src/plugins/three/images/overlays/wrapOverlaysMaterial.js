// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
export function wrapTopoLineMaterial( material, previousOnBeforeCompile ) {

	const params = {
		layerMaps: { value: [] },
		layerInfo: { value: [] },
	};

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
			.replace( /void main\(/, value => /* glsl */`

				#pragma unroll_loop_start
					for ( int i = 0; i < LAYER_COUNT; i ++ ) {

						attribute vec2 layer_uv_UNROLLED_LOOP_INDEX;
						varying vec2 v_layer_uv_UNROLLED_LOOP_INDEX;

					}
				#pragma unroll_loop_end

				${ value }

				#pragma unroll_loop_start
					for ( int i = 0; i < LAYER_COUNT; i ++ ) {

						layer_uv_UNROLLED_LOOP_INDEX = v_layer_uv_UNROLLED_LOOP_INDEX;

					}
				#pragma unroll_loop_end

			` );

		shader.fragmentShader = shader
			.fragmentShader
			.replace( /void main\(/, value => /* glsl */`

				#if LAYER_COUNT != 0
					struct LayerInfo {
						vec3 tint;
						float opacity;
						bool isMercator;
					}
					sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerInfo layerInfo[ LAYER_COUNT ];
				#endif

				#pragma unroll_loop_start
					for ( int i = 0; i < LAYER_COUNT; i ++ ) {

						varying vec2 v_layer_uv_UNROLLED_LOOP_INDEX;

					}
				#pragma unroll_loop_end

				${ value }

			` )
			.replace( /#include <color_fragment>/, value => /* glsl */`

				${ value }

				#if LAYER_COUNT != 0
				{
					vec4 layerColor;
					vec2 layerUV;
					float layerOpacity;
					#pragma unroll_loop_start
						for ( int i = 0; i < LAYER_COUNT; i ++ ) {

							layerUV = v_layer_uv_UNROLLED_LOOP_INDEX;

							// TODO: handle mercator sampling

							layerColor = texture( layerMaps[ i ], layerUV );

							// apply tint
							layerColor.rgb *= layerInfo[ i ].tint;
							layerColor.a *= layerInfo[ i ].opacity;

							// premultiplied alpha equation
							diffuseColor.rgb = layerColor + diffuseColor * ( 1.0 - layerColor.a );

						}
					#pragma unroll_loop_end
				}
				#endif
			` );

	};

	return params;

}
