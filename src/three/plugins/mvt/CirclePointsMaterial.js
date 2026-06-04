import { PointsMaterial, Vector2 } from 'three';

export class CirclePointsMaterial extends PointsMaterial {

	constructor( parameters ) {

		super( parameters );

		this.alphaToCoverage = true;
		this.vertexColors = true;
		this.transparent = true;

		// glyph atlas state — set before first render; setters sync to uniforms after compile
		this._glyphTexture = null;
		this._glyphCellSize = new Vector2();
		this._uniforms = null;

		this.onBeforeCompile = ( shader ) => {

			shader.uniforms.glyphAtlas = { value: this._glyphTexture };
			// Pass the same Vector2 reference so in-place updates are reflected automatically
			shader.uniforms.glyphCellSize = { value: this._glyphCellSize };
			this._uniforms = shader.uniforms;

			// Vertex: declare attribute + varying, assign in main
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

			// Fragment: declare varying + uniforms, circle mask + glyph composite
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
				float _dist = length( gl_PointCoord - 0.5 );
				float _fw = fwidth( _dist );
				float _circleAlpha = 1.0 - smoothstep( 0.5 - _fw * 2.0, 0.5, _dist );
				if ( _circleAlpha < 0.001 ) discard;
				diffuseColor.a *= _circleAlpha;
				if ( vGlyphUV.x >= 0.0 ) {
					vec4 _glyph = texture2D( glyphAtlas, vGlyphUV + gl_PointCoord * glyphCellSize );
					outgoingLight = mix( outgoingLight, _glyph.rgb, _glyph.a );
					// outgoingLight = _glyph;
					// diffuseColor.a = _glyph.a;
				}
				diffuseColor.a *= vAlpha;
				#include <opaque_fragment>
				`
			);

		};

		this.customProgramCacheKey = () => 'CirclePointsMaterial';

	}

	get glyphTexture() {

		return this._glyphTexture;

	}

	set glyphTexture( v ) {

		this._glyphTexture = v;
		if ( this._uniforms ) this._uniforms.glyphAtlas.value = v;

	}

	get glyphCellSize() {

		return this._glyphCellSize;

	}

}
