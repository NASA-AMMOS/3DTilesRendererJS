import { MeshBasicMaterial, Matrix3 } from 'three';

// MeshBasicMaterial with displacement map support injected for rendering displaced terrain
// without lighting. The renderer refreshes the displacement uniforms from the material properties.
export class TerrainBasicMaterial extends MeshBasicMaterial {

	constructor( params ) {

		super( params );

		this.displacementMap = null;
		this.displacementScale = 1;
		this.displacementBias = 0;

		this.onBeforeCompile = shader => {

			shader.uniforms.displacementMap = { value: null };
			shader.uniforms.displacementScale = { value: 1 };
			shader.uniforms.displacementBias = { value: 0 };
			shader.uniforms.displacementMapTransform = { value: new Matrix3() };

			shader.vertexShader = shader.vertexShader
				.replace( '#include <uv_pars_vertex>', /* glsl */`
					#include <uv_pars_vertex>
					uniform sampler2D displacementMap;
					uniform float displacementScale;
					uniform float displacementBias;
				` )
				.replace( '#include <begin_vertex>', /* glsl */`
					#include <begin_vertex>
					transformed += normalize( normal ) * ( texture2D( displacementMap, uv ).x * displacementScale + displacementBias );
				` );

		};

	}

}
