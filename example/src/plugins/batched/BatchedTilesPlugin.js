import { WebGLArrayRenderTarget, MeshBasicMaterial, REVISION } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ExpandingBatchedMesh } from './ExpandingBatchedMesh.js';
import { Group } from 'three';

function isColorWhite( color ) {

	return color.r === 1 && color.g === 1 && color.b === 1;

}

const quad = new FullScreenQuad( new MeshBasicMaterial() );
export class BatchedTilesPlugin {

	constructor( options = {} ) {

		if ( parseInt( REVISION ) < 170 ) {

			throw new Error( 'BatchedTilesPlugin: Three.js revision 170 or higher required.' );

		}

		options = {
			instanceCount: 1000,
			vertexCount: 2500,
			indexCount: 2500,
			expandPercent: 0.25,
			maxExpansionCount: 3, // TODO
			material: new MeshBasicMaterial(),
			renderer: null,
			...options
		};

		this.name = 'BATCHED_MESH_PLUGIN';

		this.instanceCount = options.instanceCount;
		this.vertexCount = options.vertexCount;
		this.indexCount = options.indexCount;
		this.material = options.material;
		this.expandPercent = options.expandPercent;
		this.renderer = options.renderer;

		this.batchedMesh = null;
		this.arrayTarget = null;
		this.tiles = null;
		this._onLoadModel = null;
		this._onDisposeModel = null;
		this._onVisibilityChange = null;

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

				tile.cached.scene = new Group();
				tile.cached.materials = [];
				tile.cached.geometries = [];
				tile.cached.textures = [];

				const mesh = meshes[ 0 ];
				this.initFrom( mesh );

				const { geometry, material } = mesh;
				const { batchedMesh, expandPercent } = this;

				batchedMesh.expandPercent = expandPercent;
				const geometryId = batchedMesh.addGeometry( geometry, this.vertexCount, this.indexCount );
				const instanceId = batchedMesh.addInstance( geometryId );
				batchedMesh.setMatrixAt( instanceId, mesh.matrixWorld );
				batchedMesh.setVisibleAt( instanceId, false );
				if ( ! isColorWhite( material.color ) ) {

					material.color.setHSL( Math.random(), 0.5, 0.5 );
					batchedMesh.setColorAt( instanceId, material.color );

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
			this.batchedMesh.deleteInstance( instanceId );

			this._tileMap.delete( tile );
			this._instanceIdMap.delete( instanceId );
			this._geometryIdMap.delete( geometryId );

		};

		this._onVisibilityChange = ( { tile, visible } ) => {

			this.batchedMesh.setVisibleAt( this._tileMap.get( tile ).instanceId, visible );

		};

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.tiles = tiles;

	}

	initFrom( target ) {

		if ( this.batchedMesh !== null ) {

			return;

		}

		// init the batched mesh
		const { instanceCount, vertexCount, indexCount, material, tiles } = this;
		const mesh = new ExpandingBatchedMesh( instanceCount, instanceCount * vertexCount, instanceCount * indexCount, material );
		mesh.name = 'BatchTilesPlugin';
		tiles.group.add( mesh );
		mesh.updateMatrixWorld();

		// init the render target
		const map = target.material.map;
		const textureOptions = 			{
			colorSpace: map.colorSpace,
			generateMipmaps: map.generateMipmaps,
			wrapS: map.wrapS,
			wrapT: map.wrapT,
			minFilter: map.minFilter,
			magFilter: map.magFilter,
		};
		const arrayTarget = new WebGLArrayRenderTarget( map.image.width, map.image.height, instanceCount );
		Object.assign( arrayTarget.texture, textureOptions );

		// init the material
		material.texture_array_uniform = { value: arrayTarget.texture };
		material.map = arrayTarget.texture;
		material.onBeforeCompile = onBeforeCompile;
		material.needsUpdate = true;

		this.arrayTarget = arrayTarget;
		this.batchedMesh = mesh;

	}

	renderTextureToLayer( texture, layer ) {

		this.expandArrayTargetIfNeeded();

		const { renderer } = this;
		const currentRenderTarget = renderer.getRenderTarget();
		renderer.setRenderTarget( this.arrayTarget, layer );
		quad.material.map = texture;
		quad.render( renderer );
		renderer.setRenderTarget( currentRenderTarget );

		quad.material.map = null;
		texture.dispose();

	}

	expandArrayTargetIfNeeded() {

		const { batchedMesh, arrayTarget, renderer, material } = this;
		if ( batchedMesh.maxInstanceCount > arrayTarget.depth ) {

			const textureOptions = {
				colorSpace: arrayTarget.texture.colorSpace,
				generateMipmaps: arrayTarget.texture.generateMipmaps,
				wrapS: arrayTarget.texture.wrapS,
				wrapT: arrayTarget.texture.wrapT,
				minFilter: arrayTarget.texture.minFilter,
				magFilter: arrayTarget.texture.magFilter,
			};

			const newArrayTarget = new WebGLArrayRenderTarget( arrayTarget.width, arrayTarget.height, batchedMesh.maxInstanceCount );
			Object.assign( newArrayTarget.texture, textureOptions );

			renderer.initRenderTarget( newArrayTarget );
			renderer.copyTextureToTexture3D( arrayTarget.texture, newArrayTarget.texture );
			arrayTarget.dispose();

			material.texture_array_uniform.value = newArrayTarget.texture;
			this.arrayTarget = newArrayTarget;

		}

	}

	dispose() {

		this.batchedMesh.geometry.dispose();
		this.batchedMesh.material.dispose();
		this.arrayTarget.dispose();

		this.tiles.removeEventListener( 'load-model', this._onLoadModel );
		this.tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );

	}

}

function onBeforeCompile( shader ) {

	this.uniforms = shader.uniforms;

	shader.uniforms.texture_array = this.texture_array_uniform || { value: null };
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

}
