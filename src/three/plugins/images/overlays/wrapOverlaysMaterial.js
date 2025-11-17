const OVERLAY_PARAMS = Symbol( 'OVERLAY_PARAMS' );

export function wrapOverlaysMaterial( material, options ) {

	// Support both old and new call signatures:
	//   wrapOverlaysMaterial(material, previousOnBeforeCompile)
	//   wrapOverlaysMaterial(material, { previousOnBeforeCompile, clipOverlay })
	const previousOnBeforeCompile = typeof options === 'function'
		? options
		: options?.previousOnBeforeCompile || options?.onBeforeCompile || null;

	// if the material has already been wrapped then return the params
	if ( material[ OVERLAY_PARAMS ] ) {

		return material[ OVERLAY_PARAMS ];

	}

	const params = {
		layerMaps: { value: [] },
		layerColor: { value: [] },

		// clip overlay uniforms
		overlayClipMap: { value: null },
		overlayClipThreshold: { value: 0.5 },
		overlayClipInside: { value: 1 }, // 1 = keep inside, 0 = keep outside
		overlayClipEnabled: { value: 0 }, // 0 = disabled, 1 = enabled

	};

	material[ OVERLAY_PARAMS ] = params;

	material.defines = {
		...( material.defines || {} ),
		LAYER_COUNT: 0,
	};


	material.onBeforeCompile = shader => {

		if ( previousOnBeforeCompile ) previousOnBeforeCompile( shader );

		shader.uniforms = {
			...shader.uniforms,
			...params,
		};

		// Toggle the define only when we actually provide the attribute and map.
		if ( params.overlayClipMap.value ) {

			shader.defines.USE_OVERLAY_CLIP = 1;

		} else {

			delete shader.defines.USE_OVERLAY_CLIP;

		}

		shader.vertexShader = shader.vertexShader.replace( /void main\(\s*\)\s*{/, value => /* glsl */`
			#pragma unroll_loop_start
			for ( int i = 0; i < 10; i ++ ) {
				#if UNROLLED_LOOP_INDEX < LAYER_COUNT
					attribute vec3 layer_uv_UNROLLED_LOOP_INDEX;
					varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;
				#endif
			}
			#pragma unroll_loop_end

			#ifdef USE_OVERLAY_CLIP
				attribute vec3 clip_uv;
				varying vec3 v_clip_uv;
			#endif

			${ value }

			#pragma unroll_loop_start
			for ( int i = 0; i < 10; i ++ ) {
				#if UNROLLED_LOOP_INDEX < LAYER_COUNT
					v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;
				#endif
			}
			#pragma unroll_loop_end

			#ifdef USE_OVERLAY_CLIP
				v_clip_uv = clip_uv;
			#endif
		` );

		shader.fragmentShader = shader.fragmentShader
			.replace( /void main\(/, value => /* glsl */`
				#if LAYER_COUNT != 0
					struct LayerTint { vec3 color; float opacity; };
					uniform sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerTint layerColor[ LAYER_COUNT ];
				#endif

				#pragma unroll_loop_start
				for ( int i = 0; i < 10; i ++ ) {
					#if UNROLLED_LOOP_INDEX < LAYER_COUNT
						varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;
					#endif
				}
				#pragma unroll_loop_end

				#ifdef USE_OVERLAY_CLIP
					uniform sampler2D overlayClipMap;
					uniform float overlayClipThreshold;
					uniform int overlayClipInside;
					uniform int overlayClipEnabled;
					uniform int overlayClipDebug;
					varying vec3 v_clip_uv;
				#endif

				${ value }
			` )
			.replace( 'void main() {', /* glsl */`
                void main() {
                #ifdef USE_OVERLAY_CLIP
                    // Optional debug tint: show mask as red (outside) vs keep color (inside)
                    if ( overlayClipDebug == 1 ) {
                        float a = texture( overlayClipMap, v_clip_uv.xy ).a;
                        // fall through; tint will be applied after base color
                    }
                #endif
			` )
			.replace( /#include <color_fragment>/, value => /* glsl */`
				${ value }
				#ifdef USE_OVERLAY_CLIP
				{
					// Apply discard first (uses w gating).
					if ( overlayClipEnabled == 1 ) {
						float wDelta = max( fwidth( v_clip_uv.z ), 1e-7 );
						float wOpacity =
							smoothstep( - wDelta, 0.0, v_clip_uv.z ) *
							smoothstep( 1.0 + wDelta, 1.0, v_clip_uv.z );

						if ( wOpacity > 0.0 ) {
							float clipAlpha = texture( overlayClipMap, v_clip_uv.xy ).a;
							bool inside = clipAlpha >= overlayClipThreshold;
							bool discardFragment = (overlayClipInside == 1) ? (!inside) : inside;
							if ( discardFragment ) discard;

						}
					}
				}
				#endif

				#if LAYER_COUNT != 0
				{
					vec4 tint;
					vec3 layerUV;
					float wOpacity;
					float wDelta;
					#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {
						#if UNROLLED_LOOP_INDEX < LAYER_COUNT
							layerUV = v_layer_uv_UNROLLED_LOOP_INDEX;
							tint = texture( layerMaps[ i ], layerUV.xy );

							wDelta = max( fwidth( layerUV.z ), 1e-7 );
							wOpacity =
								smoothstep( - wDelta, 0.0, layerUV.z ) *
								smoothstep( 1.0 + wDelta, 1.0, layerUV.z );

							tint.rgb *= layerColor[ i ].color;
							tint.rgba *= layerColor[ i ].opacity * wOpacity;

							diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );
						#endif
					}
					#pragma unroll_loop_end
				}
				#endif
			` );

	};

	return params;

}
