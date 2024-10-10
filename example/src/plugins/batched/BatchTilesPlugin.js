import { BatchedMesh, WebGLArrayRenderTarget, MeshBasicMaterial } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ExpandingBatchedMesh } from './ExpandingBatchedMesh.js';

function isColorWhite( color ) {

	return color.r === 1 && color.g === 1 && color.b === 1;

}

const quad = new FullScreenQuad( new MeshBasicMaterial() );
export class BatchTilesPlugin {

	constructor( options ) {

		const {
			instanceCount = 1000,
			vertexCount = 2500,
			indexCount = 2500,
			expandPercent = 0.25,
			maxExpansionCount = 3, // TODO
			material = new MeshBasicMaterial(),
			renderer = null,
		} = options;

		this.name = 'BATCHED_MESH_PLUGIN';

		this.instanceCount = instanceCount;
		this.vertexCount = vertexCount;
		this.indexCount = indexCount;
		this.material = material;
		this.expandPercent = expandPercent;
		this.renderer = renderer;

		this.mesh = null;
		this.arrayTarget = null;
		this.tiles = null;
		this._onLoadModel = null;
		this._onDisposeModel = null;

		this._geometryIdMap = new Map();
		this._instanceIdMap = new Map();
		this._tileMap = new Map();

	}

	init( tiles ) {

		this._onLoadModel = ( { scene, tile } ) => {

			const meshes = [];
			scene.traverse( c => {

				if ( c.isMesh ) {

					meshes.push( c );

				}

			} );

			if ( meshes.length === 1 ) {

				tile.cached.scene = null;
				tile.cached.materials = null;
				tile.cached.geometries = null;
				tile.cached.textures = null;

				const mesh = meshes[ 0 ];
				this.initFrom( mesh );

				const { geometry, material } = mesh;
				const geometryId = this.mesh.addGeometry( geometry );
				const instanceId = this.addInstance( geometryId );
				mesh.setMatrixAt( instanceId, mesh.matrixWorld );
				if ( isColorWhite( material.color ) ) {

					mesh.setColorAt( material.color );

				}

				const texture = material.map;
				this.renderTextureToLayer( texture, instanceId );

				this._tileMap.set( tile, { geometryId, instanceId } );
				this._instanceIdMap.set( instanceId, tile );
				this._geometryIdMap.set( geometryId, tile );

			}

		};

		this._onDisposeModel = ( { tile } ) => {

			const { geometryId, instanceId } = this._tileMap.get( tile );
			this.mesh.deleteInstance( instanceId );

			this._tileMap.delete( tile );
			this._instanceIdMap.delete( instanceId );
			this._geometryIdMap.delete( geometryId );

		};

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		this.tiles = tiles;

	}

	initFrom( target ) {

		if ( this.mesh !== null ) {

			return;

		}

		// init the batched mesh
		const { instanceCount, vertexCount, indexCount, material, tiles } = this;
		const mesh = new ExpandingBatchedMesh( instanceCount, instanceCount * vertexCount, instanceCount * indexCount, material );
		mesh.name = 'BatchTilesPlugin';
		tiles.scene.add( mesh );

		// init the render target
		const map = target.material.map;
		const arrayTarget = new WebGLArrayRenderTarget( target.width, target.height, instanceCount, {
			colorSpace: map.colorSpace,
			generateMipmaps: map.generateMipmaps,
		} );

		// init the material
		material.texture_array_uniform = { value: arrayTarget.texture };
		material.onBeforeCompile = onBeforeCompile;
		material.needsUpdate = true;

		this.arrayTarget = arrayTarget;
		this.mesh = mesh;

	}

	addInstance( geomId ) {

		const { mesh, renderer, material, expandPercent, arrayTarget } = this;
		mesh.expandPercent = expandPercent;
		const id = mesh.addInstance( geomId );

		if ( mesh.maxInstanceCount >= arrayTarget.depth ) {

			const newTarget = new WebGLArrayRenderTarget( arrayTarget.width, arrayTarget.height, mesh.maxInstanceCount, {
				colorSpace: arrayTarget.texture.colorSpace,
				generateMipmaps: arrayTarget.texture.generateMipmaps,
			} );

			renderer.copyTextureToTexture3D( arrayTarget.texture, newTarget.texture );
			arrayTarget.dispose();

			material.texture_array_uniform.value = newTarget.texture;
			this.arrayTarget = newTarget;

		}

		return id;

	}

	renderTextureToLayer( texture, layer ) {

		const { renderer } = this;
		const ogRenderTarget = renderer.getRenderTarget();
		renderer.setRenderTarget( this.arrayTarget, layer );
		quad.material.map = texture;
		quad.render( renderer );
		renderer.setRenderTarget( ogRenderTarget );

		texture.dispose();

	}

	dispose() {

		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
		this.arrayTarget.dispose();

		this.tiles.removeEventListener( 'load-model', this._onLoadModel );
		this.tiles.removeEventListener( 'dispose-model', this._onDisposeModel );

	}

}

function onBeforeCompile( shader ) {

	this.uniforms = shader.uniforms;

	shader.uniforms.texture_array = this.texture_array_uniform || { value: null };
	shader.vertexShader = shader.vertexShader
		.replace(
			'#include <common>',
			`#include <common>
			varying float texture_index;
			`,
		)
		.replace(
			'#include <uv_vertex>',
			`#include <uv_vertex>
			texture_index = getIndirectIndex( gl_DrawID );
			`,
		);
	shader.fragmentShader = shader.fragmentShader
		.replace(
			'#include <map_pars_fragment>',
			`
			#include <map_pars_fragment>

			precision highp sampler2DArray;
			uniform sampler2DArray texture_array;
			varying float texture_index;
			`,
		)
		.replace(
			'#include <map_fragment>',
			`
			#if defined( USE_MAP ) && ! defined( COLOR_ONLY )
				diffuseColor *= texture( texture_array, vec3( vMapUv, texture_index ) );
			#endif
			`
		);

}
