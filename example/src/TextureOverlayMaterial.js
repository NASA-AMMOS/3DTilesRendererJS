export const TextureOverlayMaterialMixin = base => class extends base {

	constructor( ...args ) {

		super( ...args );
		this.textures = [];

	}

	onBeforeCompile( shader ) {

		const textures = this.textures;
		const material = this;

		shader.uniforms.textures = {
			get value() {

				return material.textures;

			},
		};

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
						col = vec4( 0, 0, 1, col.r );
						diffuseColor = mix( diffuseColor, vec4( 0.35, 0.65, 1, 1 ), col.a );

					}
					#pragma unroll_loop_end

				` );

		}

	}

	customProgramCacheKey() {

		return this.textures.length + this.onBeforeCompile.toString();

	}

};
