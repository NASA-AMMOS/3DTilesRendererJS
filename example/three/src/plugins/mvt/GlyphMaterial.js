import { PointsMaterial, Vector2 } from 'three';
import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';

export class GlyphMaterial extends PointsMaterial {

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

	get glyphCellSize() {

		return this._glyphCellSize;

	}

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

		// owns the glyph atlas ( unless one is provided ); the cell size is kept in sync with it
		// and pushed to the uniforms after compile
		this._glyphCellSize = new Vector2();
		this._glyphAtlas = new GlyphAtlasTexture();
		this._uniforms = null;

		this.onBeforeCompile = ( shader ) => {

			shader.uniforms.glyphAtlas = { value: this._glyphAtlas };
			shader.uniforms.glyphCellSize = { value: this._glyphCellSize };
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

			shader.fragmentShader = /* glsl */`

					uniform sampler2D glyphAtlas;
					uniform vec2 glyphCellSize;
					varying vec2 vGlyphUV;
					varying float vAlpha;
					varying float vAngle;

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

						diffuseColor.a *= vAlpha;
						gl_FragColor = diffuseColor;

						#include <tonemapping_fragment>
						#include <colorspace_fragment>
						#include <premultiplied_alpha_fragment>


					}


			`;

		};

	}

	onBeforeRender() {

		this._glyphAtlas.getSlotSize( this._glyphCellSize );

	}

}
