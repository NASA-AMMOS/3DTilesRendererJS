/** @import { Texture } from 'three' */
import { PointsMaterial, Vector2, Vector4 } from 'three';
import { MVTGlyphAtlasTexture } from './MVTGlyphAtlasTexture.js';

const _viewport = /* @__PURE__ */ new Vector4();

/**
 * A `PointsMaterial` that draws each point sprite as a glyph from an `MVTGlyphAtlasTexture` with fading.
 * @private
 * @extends PointsMaterial
 */
export class MVTGlyphMaterial extends PointsMaterial {

	/**
	 * The glyph atlas sampled by this material.
	 * @type {MVTGlyphAtlasTexture}
	 */
	get glyphAtlas() {

		return this._glyphAtlas;

	}

	set glyphAtlas( v ) {

		this._glyphAtlas = v;
		if ( v !== null ) {

			v.getSlotSize( this._glyphCellSize );

		}

		if ( this._uniforms ) {

			this._uniforms.glyphAtlas.value = v;

		}

	}

	/**
	 * A single atlas slot's size in UV units.
	 * @type {Vector2}
	 */
	get glyphCellSize() {

		return this._glyphCellSize;

	}

	/**
	 * Scene depth texture the glyphs fade against so they hide behind terrain, or null to
	 * disable the fading.
	 * @type {Texture|null}
	 */
	get depthFadeTexture() {

		return this._depthFadeTexture;

	}

	set depthFadeTexture( v ) {

		if ( v !== this._depthFadeTexture ) {

			this._depthFadeTexture = v;
			if ( Boolean( v ) !== Boolean( this.defines.USE_DEPTH_FADE ) ) {

				if ( v ) {

					this.defines.USE_DEPTH_FADE = '';

				} else {

					delete this.defines.USE_DEPTH_FADE;

				}

				this.needsUpdate = true;

			}

			if ( this._uniforms ) {

				this._uniforms.depthFadeTexture.value = v;

			}

		}

	}

	/**
	 * @param {Object} [parameters] - `PointsMaterial` parameters, plus the overrides below.
	 * @param {number} [parameters.size=25] - Point size in pixels.
	 * @param {boolean} [parameters.sizeAttenuation=false] - Whether point size shrinks with distance.
	 */
	constructor( parameters = {} ) {

		const {
			size = 25,
			sizeAttenuation = false,
			...rest
		} = parameters;

		super( { size, sizeAttenuation, ...rest } );

		this.transparent = true;
		this.depthTest = false;
		this.depthWrite = false;
		this.resolution = new Vector2();
		this.defines = {};

		// owns the glyph atlas ( unless one is provided ); the cell size is kept in sync with it
		// and pushed to the uniforms after compile
		this._glyphCellSize = new Vector2();
		this._glyphAtlas = new MVTGlyphAtlasTexture();
		this._depthFadeTexture = null;
		this._uniforms = null;

		this.onBeforeCompile = ( shader ) => {

			shader.uniforms.glyphAtlas = { value: this._glyphAtlas };
			shader.uniforms.glyphCellSize = { value: this._glyphCellSize };
			shader.uniforms.depthFadeTexture = { value: this._depthFadeTexture };
			shader.uniforms.depthFadeNear = { value: 0.1 };
			shader.uniforms.depthFadeFar = { value: 1000 };
			this._uniforms = shader.uniforms;

			shader.vertexShader = shader.vertexShader.replace(
				'#include <color_pars_vertex>',
				/* glsl */`
					#include <color_pars_vertex>
					attribute vec2 glyphUV;
					attribute float alpha;
					attribute float angle;
					varying vec2 vGlyphUV;
					varying float vAlpha;
					varying float vAngle;

					#ifdef USE_DEPTH_FADE

						attribute vec3 anchorPosition;
						uniform sampler2D depthFadeTexture;
						uniform float depthFadeNear;
						uniform float depthFadeFar;
						varying float vVisibility;

						// How far the glyph must sit behind the surface before fading and the
						// width of the fade band, both relative to the view distance so the
						// behavior is consistent at every scale.
						#define DEPTH_FADE_BIAS_RATIO 0.002
						#define DEPTH_FADE_WINDOW_RATIO 0.01

						// Fraction of the view distance the anchor is pulled toward the camera
						// before comparing so anchors placed exactly on the surface do not flicker
						// against their own depth. The screen position is unaffected.
						#define DEPTH_FADE_CAMERA_PULL 0.99

						// view space distance for a depth buffer value
						float depthFadeViewDistance( float depth ) {

							float zNdc = depth * 2.0 - 1.0;
							return 2.0 * depthFadeNear * depthFadeFar / ( depthFadeFar + depthFadeNear - zNdc * ( depthFadeFar - depthFadeNear ) );

						}

						// Opacity of the glyph based on how far behind the rendered scene depth it
						// sits, ramping off over a distance window rather than clipping.
						float depthFadeOpacity( vec3 ndc ) {

							float sceneDist = depthFadeViewDistance( texture2D( depthFadeTexture, ndc.xy * 0.5 + 0.5 ).r );
							float glyphDist = depthFadeViewDistance( ndc.z * 0.5 + 0.5 );
							float behind = glyphDist - sceneDist - glyphDist * DEPTH_FADE_BIAS_RATIO;
							return 1.0 - clamp( behind / ( glyphDist * DEPTH_FADE_WINDOW_RATIO ), 0.0, 1.0 );

						}

						// Averages a small ring of samples around the point so the fade is stable
						// against depth aliasing at grazing angles, and glyphs partially clearing
						// a silhouette fade smoothly.
						float depthFadeVisibility( vec4 pos ) {

							vec3 ndc = pos.xyz / pos.w;
							float d = depthFadeOpacity( ndc );
							if ( d > 0.95 ) {

								return 1.0;

							}

							float sum = d;
							sum += depthFadeOpacity( ndc + vec3( 0.01, 0.0, 0.0 ) );
							sum += depthFadeOpacity( ndc + vec3( - 0.01, 0.0, 0.0 ) );
							sum += depthFadeOpacity( ndc + vec3( 0.0, 0.01, 0.0 ) );
							sum += depthFadeOpacity( ndc + vec3( 0.0, 0.02, 0.0 ) );
							return sum / 5.0;

						}

					#endif
				`
			);

			shader.vertexShader = shader.vertexShader.replace(
				'#include <color_vertex>',
				/* glsl */`
					#include <color_vertex>
					vGlyphUV = glyphUV;
					vAlpha = alpha;
					vAngle = angle;
				`
			);

			shader.vertexShader = shader.vertexShader.replace(
				'#include <project_vertex>',
				/* glsl */`
					#include <project_vertex>
					#ifdef USE_DEPTH_FADE

						// Evaluate the visibility at the shared label anchor so all of a label's
						// glyphs fade together, pulling the anchor slightly toward the camera
						// along the view ray so the screen position is unchanged.
						vec4 anchorView = modelViewMatrix * vec4( anchorPosition, 1.0 );
						anchorView.xyz *= DEPTH_FADE_CAMERA_PULL;
						vVisibility = depthFadeVisibility( projectionMatrix * anchorView );

					#endif
				`
			);

			shader.fragmentShader = /* glsl */`

					uniform sampler2D glyphAtlas;
					uniform vec2 glyphCellSize;
					uniform float opacity;
					varying vec2 vGlyphUV;
					varying float vAlpha;
					varying float vAngle;

					#ifdef USE_DEPTH_FADE

						varying float vVisibility;

					#endif

					void main() {

						vec4 diffuseColor = vec4( 0.0 );
						if ( vGlyphUV.x >= 0.0 ) {

							// rotate the point-sprite lookup around its center so the glyph follows
							// the path direction; clamp keeps the rotated corners inside the slot
							vec2 pc = gl_PointCoord - 0.5;
							float c = cos( vAngle );
							float s = sin( vAngle );
							pc = vec2( c * pc.x + s * pc.y, - s * pc.x + c * pc.y ) + 0.5;
							pc = clamp( pc, 0.0, 1.0 );

							vec4 glyph = texture2D( glyphAtlas, vGlyphUV + pc * glyphCellSize * vec2( 1.0, - 1.0 ) );
							diffuseColor = glyph;

						}

						diffuseColor.a *= vAlpha * opacity;

						#ifdef USE_DEPTH_FADE

							diffuseColor.a *= vVisibility;

						#endif

						gl_FragColor = diffuseColor;

						#include <tonemapping_fragment>
						#include <colorspace_fragment>
						#include <premultiplied_alpha_fragment>


					}


			`;

		};

	}

	onBeforeRender( renderer, scene, camera ) {

		this._glyphAtlas.getSlotSize( this._glyphCellSize );

		// viewport size in pixels, refreshed each frame in onBeforeRender for screen-space raycasting
		renderer.getViewport( _viewport );
		this.resolution.set( _viewport.z, _viewport.w );

		// camera clip range for linearizing the depth fade comparisons
		if ( this._uniforms && camera ) {

			this._uniforms.depthFadeNear.value = camera.near;
			this._uniforms.depthFadeFar.value = camera.far;

		}

	}

}
