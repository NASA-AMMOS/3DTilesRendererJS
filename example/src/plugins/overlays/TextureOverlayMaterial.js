export const TextureOverlayMaterialMixin = base => class extends base {

	constructor( ...args ) {

		super( ...args );
		this.textures = [];
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

		shader.defines = {
			DISPLAY_AS_OVERLAY: Number( this.displayAsOverlay ),
		};

		console.log('UPDATE')

		// WebGL does not seem to like empty texture arrays
		if ( textures.length !== 0 ) {

			shader.fragmentShader = shader.fragmentShader
				.replace( /void main/, m => /* glsl */`
					uniform sampler2D textures[ ${ textures.length } ];
					${ m }

				` )
				.replace( /#include <color_fragment>/, m => /* glsl */`

					${ m }

					vec4 col;
					#pragma unroll_loop_start
					for ( int i = 0; i < ${ textures.length }; i ++ ) {

						col = texture( textures[ i ], vMapUv );

						#if DISPLAY_AS_OVERLAY

						diffuseColor = mix( diffuseColor, vec4( 0.22, 0.73, 0.82, 1 ), col.r * 0.5 );

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
