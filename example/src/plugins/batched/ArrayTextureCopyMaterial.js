import { MeshBasicMaterial } from 'three';

export class ArrayTextureCopyMaterial extends MeshBasicMaterial {

	set layer( v ) {

		this._layerUniform.value = v;

	}

	get layer() {

		return this._layerUniform.value;

	}

	constructor( ...args ) {

		super( ...args );
		this._layerUniform = { value: 0 };

	}

	onBeforeCompile( shader ) {

		shader.uniforms.layer = this._layerUniform;

		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <map_pars_fragment>',
				/* glsl */`
				#ifdef USE_MAP
				precision highp sampler2DArray;
				uniform sampler2DArray map;
				uniform int layer;
				#endif
				`,
			)
			.replace(
				'#include <map_fragment>',
				/* glsl */`
				#ifdef USE_MAP
					diffuseColor *= texture( map, vec3( vMapUv, layer ) );
				#endif
				`
			);

	}

}
