import { PointsMaterial, Vector2 } from 'three';

export class GlyphMaterial extends PointsMaterial {

	constructor( { glyphAtlas = null, size = 25, sizeAttenuation = false, ...parameters } = {} ) {

		super( { size, sizeAttenuation, ...parameters } );

		this.transparent = true;
		this.depthTest = false;
		this.depthWrite = false;

		// glyph atlas state — set before first render; setters sync to uniforms after compile
		this._glyphTexture = glyphAtlas;
		this._glyphCellSize = new Vector2();
		this._uniforms = null;

		if ( glyphAtlas ) {

			const { u, v } = glyphAtlas.glyphCellUVSize;
			this._glyphCellSize.set( u, v );

		}

		this.onBeforeCompile = ( shader ) => {

			shader.uniforms.glyphAtlas = { value: this._glyphTexture };
			shader.uniforms.glyphCellSize = { value: this._glyphCellSize };
			this._uniforms = shader.uniforms;

			shader.vertexShader = shader.vertexShader.replace(
				'#include <color_pars_vertex>',
				/* glsl */`
				#include <color_pars_vertex>
				attribute vec2 glyphUV;
				attribute float alpha;
				varying vec2 vGlyphUV;
				varying float vAlpha;
				`
			);

			shader.vertexShader = shader.vertexShader.replace(
				'#include <color_vertex>',
				/* glsl */`
				#include <color_vertex>
				vGlyphUV = glyphUV;
				vAlpha = alpha;
				`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <color_pars_fragment>',
				/* glsl */`
				#include <color_pars_fragment>
				uniform sampler2D glyphAtlas;
				uniform vec2 glyphCellSize;
				varying vec2 vGlyphUV;
				varying float vAlpha;
				`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <opaque_fragment>',
				/* glsl */`
				if ( vGlyphUV.x >= 0.0 ) {

					vec4 glyph = texture2D( glyphAtlas, vGlyphUV + gl_PointCoord * glyphCellSize );
					outgoingLight = mix( outgoingLight, glyph.rgb, glyph.a );
					diffuseColor.a = glyph.a;

				}

				diffuseColor.a *= vAlpha;

				#include <opaque_fragment>
				`
			);

		};

		this.customProgramCacheKey = () => 'GlyphMaterial';

	}

	get glyphTexture() {

		return this._glyphTexture;

	}

	set glyphTexture( v ) {

		this._glyphTexture = v;
		if ( this._uniforms ) {

			this._uniforms.glyphAtlas.value = v;

		}

	}

	get glyphCellSize() {

		return this._glyphCellSize;

	}

}
