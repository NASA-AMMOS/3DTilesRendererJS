import { Color } from 'three';

export const TextureOverlayMaterialMixin = base => class extends base {

	constructor( ...args ) {

		super( ...args );
		this.textures = [];
		this.overlayColor = new Color( 0x84ffff );
		this.displayAsOverlay = false;

	}

	onBeforeCompile( shader ) {

		const textures = this.textures;
		const material = this;

		shader.uniforms.textures = {
			get value() {

				return material.textures;

			},
		};

		shader.uniforms.overlayColor = {
			get value() {

				return material.overlayColor;

			},
		};

		shader.defines = {
			DISPLAY_AS_OVERLAY: Number( this.displayAsOverlay ),
		};

		// WebGL does not seem to like empty texture arrays
		if ( textures.length !== 0 ) {

			shader.fragmentShader = shader.fragmentShader
				.replace( /void main/, m => /* glsl */`
					uniform sampler2D textures[ ${ textures.length } ];
					uniform vec3 overlayColor;
					${ m }

				` )
				.replace( /#include <color_fragment>/, m => /* glsl */`

					${ m }

					vec4 col;
					#pragma unroll_loop_start
					for ( int i = 0; i < ${ textures.length }; i ++ ) {

						col = texture( textures[ i ], vMapUv );

						#if DISPLAY_AS_OVERLAY

						diffuseColor = mix( diffuseColor, vec4( overlayColor, 1.0 ), col.r * 0.5 );

						#else

						diffuseColor = mix( diffuseColor, col, col.a );

						#endif

					}
					#pragma unroll_loop_end

				` );

		}

	}

	customProgramCacheKey() {

		return String( this.displayAsOverlay ) + String( this.textures.length ) + this.onBeforeCompile.toString();

	}

};
