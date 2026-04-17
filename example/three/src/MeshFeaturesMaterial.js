import { MeshBasicMaterial } from 'three';

export const MeshFeaturesMaterialMixin = base => class extends base {

	get featureTexture() {

		return this.uniforms.featureTexture.value;

	}

	set featureTexture( v ) {

		const texture = this.uniforms.featureTexture.value;
		if ( texture !== v && texture ) {

			texture.dispose();

		}

		this.uniforms.featureTexture.value = v;

	}

	get nullFeatureId() {

		return this.uniforms.nullFeatureId.value;

	}

	set nullFeatureId( v ) {

		if ( v < 0 || v === null || v === undefined ) {

			this.uniforms.nullFeatureId.value = null;
			this.setDefine( 'USE_NULL_FEATURE', 0 );

		} else {

			this.uniforms.nullFeatureId.value = v;
			this.setDefine( 'USE_NULL_FEATURE', 1 );

		}

	}

	get highlightFeatureId() {

		return this.uniforms.highlightFeatureId.value;

	}

	set highlightFeatureId( v ) {

		if ( v === null || v === undefined ) {

			this.uniforms.highlightFeatureId.value = null;
			this.setDefine( 'USE_HIGHLIGHT_FEATURE', 0 );

		} else {

			this.uniforms.highlightFeatureId.value = v;
			this.setDefine( 'USE_HIGHLIGHT_FEATURE', 1 );

		}

	}

	constructor( ...args ) {

		super( ...args );

		this.isMeshFeaturesMaterial = true;
		this.uniforms = {

			featureChannelsLength: { value: 0 },
			featureChannels: { value: new Array( 4 ).fill( 0 ) },
			featureTexture: { value: null },
			nullFeatureId: { value: null },
			highlightFeatureId: { value: - 1 },

		};

		Object.assign( this.defines, {

			// 0: Disabled
			// 1: Implicit
			// 2: Attribute
			// 3: Texture
			FEATURE_TYPE: 0,
			USE_HIGHLIGHT_FEATURE: 0,
			USE_NULL_FEATURE: 0,
			FEATURE_ATTR: '',
			FEATURE_TEXTURE_ATTR: 'uv',

		} );

		this.addEventListener( 'dispose', () => {

			if ( this.featureTexture ) {

				this.featureTexture.dispose();

			}

		} );

	}

	copy( source ) {

		const currentDefines = this.defines;

		super.copy( source );

		if ( source.defines ) {

			Object.assign( this.defines, currentDefines, source.defines );

		}

		if ( source.uniforms ) {

			for ( const key in this.uniforms ) {

				const value = source.uniforms[ key ].value;
				if ( Array.isArray( value ) ) {

					this.uniforms[ key ].value = value.slice();

				} else {

					this.uniforms[ key ].value = value;

				}

			}

		}

		this.needsUpdate = true;



	}

	setDefine( define, value ) {

		const defines = this.defines;
		if ( defines[ define ] !== value ) {

			this.needsUpdate = true;

		}

		if ( value === null ) {

			delete defines[ define ];

		} else {

			defines[ define ] = value;

		}

	}

	setFromMeshFeatures( meshFeatures, featureIdOrName ) {

		let info = null;
		if ( typeof featureIdOrName === 'number' ) {

			info = meshFeatures.getFeatureInfo()[ featureIdOrName ] || null;

		} else if ( typeof featureIdOrName === 'string' ) {

			info = meshFeatures.getFeatureInfo().find( el => el.label === featureIdOrName ) || null;

		}

		if ( info === null ) {

			this.setDefine( 'FEATURE_TYPE', 0 );
			this.featureTexture = null;

		} else if ( 'attribute' in info ) {

			this._setAttributeFeature( info.attribute );

		} else if ( 'texture' in info ) {

			this._setTextureFeature( meshFeatures.textures[ info.texture.index ], info.texture.texCoord, info.texture.channels );

		} else {

			this._setAttributeFeature( null );

		}

		if ( info !== null ) {

			this.nullFeatureId = info.nullFeatureId == null ? null : info.nullFeatureId;

		}

	}

	disableFeatureDisplay() {

		this.setDefine( 'FEATURE_TYPE', 0 );
		this.featureTexture = null;

	}

	_setTextureFeature( texture, uv, channels ) {

		const uniforms = this.uniforms;

		this.setDefine( 'FEATURE_TYPE', 3 );
		if ( uv === 0 ) {

			this.setDefine( 'FEATURE_TEXTURE_ATTR', 'uv' );
			this.setDefine( 'USE_UV', '' );

		} else {

			this.setDefine( 'FEATURE_TEXTURE_ATTR', `uv${ uv }` );
			this.setDefine( `USE_UV${ uv }`, '' );

		}

		// remove other uv channels
		if ( uv !== 0 ) this.setDefine( 'USE_UV', null );
		if ( uv !== 1 ) this.setDefine( 'USE_UV1', null );
		if ( uv !== 2 ) this.setDefine( 'USE_UV2', null );
		if ( uv !== 3 ) this.setDefine( 'USE_UV3', null );

		uniforms.featureChannelsLength.value = channels.length;
		uniforms.featureChannels.value = [ ...channels ];
		this.featureTexture = texture;

	}

	_setAttributeFeature( attribute = null ) {

		if ( attribute === null ) {

			this.setDefine( 'FEATURE_TYPE', 1 );

		} else {

			this.setDefine( 'FEATURE_TYPE', 2 );
			this.setDefine( 'FEATURE_ATTR', `_feature_id_${ attribute }` );

		}

		this.featureTexture = null;

	}

	customProgramCacheKey() {

		const defines = this.defines;
		return `${ defines.FEATURE_TYPE }|${ defines.USE_HIGHLIGHT_FEATURE }|${ defines.USE_NULL_FEATURE }|${ defines.FEATURE_ATTR }|${ defines.FEATURE_TEXTURE_ATTR }`;

	}

	onBeforeCompile( shader ) {

		shader.uniforms = {

			...shader.uniforms,
			...this.uniforms,

		};

		shader.defines = this.defines;

		shader.vertexShader = shader.vertexShader
			.replace( /^/, match =>
				/* glsl */`
					// texture
					#if FEATURE_TYPE == 3

						varying vec2 _feature_uv;

					// attribute
					#elif FEATURE_TYPE == 2

						attribute float FEATURE_ATTR;
						flat varying uint _feature_attr;

					// implicit
					#elif FEATURE_TYPE == 1

						flat varying uint _feature_attr;

					#endif

					${ match }
				`,
			)
			.replace( /void main\(\) {/, match =>
				/* glsl */`
					${ match }

					// texture
					#if FEATURE_TYPE == 3

						_feature_uv = FEATURE_TEXTURE_ATTR;

					// attribute
					#elif FEATURE_TYPE == 2

						_feature_attr = uint( FEATURE_ATTR );

					// none
					#elif FEATURE_TYPE == 1

						_feature_attr = uint( gl_VertexID );

					#endif
				`,
			);


		shader.fragmentShader = shader.fragmentShader
			.replace( /^/, match =>
				/* glsl */`

					#if USE_HIGHLIGHT_FEATURE

						uniform uint highlightFeatureId;

					#endif

					#if USE_NULL_FEATURE

						uniform uint nullFeatureId;

					#endif

					// texture
					#if FEATURE_TYPE == 3

						uniform sampler2D featureTexture;
						uniform int featureChannelsLength;
						uniform uint featureChannels[ 4 ];
						varying vec2 _feature_uv;

					// attribute
					#elif FEATURE_TYPE == 2

						flat varying uint _feature_attr;

					// none
					#elif FEATURE_TYPE == 1

						flat varying uint _feature_attr;

					#endif

					// https://www.shadertoy.com/view/XljGzV
					vec3 hsl2rgb( in vec3 c ) {

						vec3 rgb = clamp( abs( mod( c.x * 6.0 + vec3( 0.0, 4.0, 2.0 ), 6.0 ) - 3.0 ) - 1.0, 0.0, 1.0 );
    					return c.z + c.y * ( rgb - 0.5 ) * ( 1.0 - abs( 2.0 * c.z - 1.0 ) );

					}

					// https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
					float rand( float v ) {

						return fract( sin( dot( vec2( v, v ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );

					}

					vec3 randFeatureColor( uint feature ) {

						vec3 hsl;
						hsl.r = rand( float( feature ) / 5500.0 );
						hsl.g = 0.75;
						hsl.b = 0.5;
						return hsl2rgb( hsl );

					}

					${ match }
				`,
			)
			.replace( /#include <color_fragment>/, match =>
				/* glsl */`
					${ match }

					// disabled
					#if FEATURE_TYPE != 0

						uint featureId = 0u;

						// texture
						#if FEATURE_TYPE == 3

							// TODO: support anti aliasing here at the pixel edges
							uvec4 fields = uvec4( texture( featureTexture, _feature_uv ) * float( 0xff ) );
							for ( int i = 0; i < min( featureChannelsLength, 4 ); i ++ ) {

								uint offset = 8u * featureChannels[ i ];
								featureId = featureId | ( fields[ i ] << offset );

							}

						// attribute
						#elif FEATURE_TYPE == 2

							featureId = _feature_attr;

						// implicit
						#elif FEATURE_TYPE == 1

							featureId = _feature_attr;

						#endif

						#if USE_HIGHLIGHT_FEATURE

							if ( highlightFeatureId != featureId ) {

								diffuseColor.rgb *= 0.25;

							}

						#else

							vec3 featureColor = randFeatureColor( featureId );
							diffuseColor.rgb = mix( diffuseColor.rgb * featureColor, featureColor, 0.05 );

						#endif

						#if USE_NULL_FEATURE

							if ( nullFeatureId == featureId ) {

								diffuseColor.rgb *= vec3( 0.0 );

							}

						#endif

					#endif

				`,
			);

	}

};

export const MeshFeaturesMaterial = MeshFeaturesMaterialMixin( MeshBasicMaterial );
