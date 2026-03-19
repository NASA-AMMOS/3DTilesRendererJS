import { ShaderMaterial } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// Quad for copying individual layers between array textures via rendering.
// Avoids copyTexSubImage3D which has driver issues on some mobile GPUs.
export const layerCopyQuad = new FullScreenQuad( new ShaderMaterial( {
	uniforms: {
		srcTexture: { value: null },
		layer: { value: 0 },
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,
	fragmentShader: /* glsl */`
		precision highp sampler2DArray;
		uniform sampler2DArray srcTexture;
		uniform float layer;
		varying vec2 vUv;
		void main() {
			gl_FragColor = texture( srcTexture, vec3( vUv, layer ) );
		}
	`,
} ) );

// Returns whether the passed color is white or not
export function isColorWhite( color ) {

	return color.r === 1 && color.g === 1 && color.b === 1;

}

// Adjusts the given material to take an ArrayTexture for a map
export function convertMapToArrayTexture( material ) {

	material.needsUpdate = true;
	material.onBeforeCompile = shader => {

		shader.vertexShader = shader.vertexShader
			.replace(
				'#include <common>',
				/* glsl */`
				#include <common>
				varying float texture_index;
				`,
			)
			.replace(
				'#include <uv_vertex>',
				/* glsl */`
				#include <uv_vertex>
				texture_index = getIndirectIndex( gl_DrawID );
				`,
			);

		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <map_pars_fragment>',
				/* glsl */`
				#ifdef USE_MAP
				precision highp sampler2DArray;
				uniform sampler2DArray map;
				varying float texture_index;
				#endif
				`,
			)
			.replace(
				'#include <map_fragment>',
				/* glsl */`
				#ifdef USE_MAP
					diffuseColor *= texture( map, vec3( vMapUv, texture_index ) );
				#endif
				`
			);

	};

}
