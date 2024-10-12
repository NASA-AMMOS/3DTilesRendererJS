import { WebGLArrayRenderTarget, MeshBasicMaterial, Group, REVISION } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ExpandingBatchedMesh } from './ExpandingBatchedMesh.js';
import { ArrayTextureCopyMaterial } from './ArrayTextureCopyMaterial.js';
import { convertMapToArrayTexture, isColorWhite } from './utilities.js';

const _textureRenderQuad = new FullScreenQuad( new MeshBasicMaterial() );
const _layerCopyQuad = new FullScreenQuad( new ArrayTextureCopyMaterial() );

export class BatchedTilesPlugin {

	constructor( options = {} ) {

		if ( parseInt( REVISION ) < 170 ) {

			throw new Error( 'BatchedTilesPlugin: Three.js revision 170 or higher required.' );

		}

		options = {
			instanceCount: 500,
			vertexCount: 750,
			indexCount: 2000,
			expandPercent: 0.25,

			// TODO
			maxVertexCount: Infinity,
			maxIndexCount: Infinity,
			maxInstanceCount: Infinity,

			material: null,
			renderer: null,
			...options
		};

		this.name = 'BATCHED_MESH_PLUGIN';

		// limit the amount of instances to the size of a 3d texture to avoid over flowing the
		const gl = options.renderer.getContext();

		// save options
		this.instanceCount = options.instanceCount;
		this.vertexCount = options.vertexCount;
		this.indexCount = options.indexCount;
		this.material = options.material ? options.material.clone() : null;
		this.expandPercent = options.expandPercent;
		this.maxVertexCount = options.maxVertexCount;
		this.maxIndexCount = options.maxIndexCount;
		this.maxInstanceCount = Math.min( options.maxInstanceCount, gl.getParameter( gl.MAX_3D_TEXTURE_SIZE ) );
		this.renderer = options.renderer;

		// local variables
		this.batchedMesh = null;
		this.arrayTarget = null;
		this.tiles = null;
		this._onLoadModel = null;
		this._onDisposeModel = null;
		this._onVisibilityChange = null;
		this._tileToInstanceId = new Map();

	}

	init( tiles ) {

		this._onLoadModel = ( { scene, tile } ) => {

			// find the meshes in the scene
			const meshes = [];
			scene.traverse( c => {

				if ( c.isMesh ) {

					meshes.push( c );

				}

			} );

			if ( meshes.length === 1 && ( ! this.batchedMesh || this.batchedMesh.instanceCount < this.maxInstanceCount ) ) {

				scene.updateMatrixWorld();

				// TODO: ideally we could just set these to null
				tile.cached.scene = new Group();
				tile.cached.materials = [];
				tile.cached.geometries = [];
				tile.cached.textures = [];

				const mesh = meshes[ 0 ];
				this.initBatchedMesh( mesh );

				const { geometry, material } = mesh;
				const { batchedMesh, expandPercent } = this;

				// assign expandPercent in case it has changed
				batchedMesh.expandPercent = expandPercent;

				// TODO: we should let the batched mesh functions fail to add the geometry and an instance to the mesh
				// and then defer to meshes if necessary
				const geometryId = batchedMesh.addGeometry( geometry, this.vertexCount, this.indexCount );
				const instanceId = batchedMesh.addInstance( geometryId );
				batchedMesh.setMatrixAt( instanceId, mesh.matrixWorld );
				batchedMesh.setVisibleAt( instanceId, false );
				if ( ! isColorWhite( material.color ) ) {

					material.color.setHSL( Math.random(), 0.5, 0.5 );
					batchedMesh.setColorAt( instanceId, material.color );

				}

				// render the material
				const texture = material.map;
				this.renderTextureToLayer( texture, instanceId );

				this._tileToInstanceId.set( tile, instanceId );

			} else {

				meshes.map( m => m.material.color.set( 0xff0000 ) );

			}

		};

		this._onDisposeModel = ( { tile } ) => {

			if ( this._tileToInstanceId.has( tile ) ) {

				const instanceId = this._tileToInstanceId.get( tile );
				this.batchedMesh.deleteInstance( instanceId );
				this._tileToInstanceId.delete( tile );

			}

		};

		this._onVisibilityChange = ( { tile, visible } ) => {

			if ( this._tileToInstanceId.has( tile ) ) {

				this.batchedMesh.setVisibleAt( this._tileToInstanceId.get( tile ), visible );

			}

		};

		// register events
		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );

		// prepare all already loaded geometry
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onLoadModel( { scene, tile } );

		} );
		this.tiles = tiles;

	}

	// init the batched mesh if it's not ready
	initBatchedMesh( target ) {

		if ( this.batchedMesh !== null ) {

			return;

		}

		// init the batched mesh
		const { instanceCount, vertexCount, indexCount, tiles } = this;
		const material = this.material ? this.material : new target.material.constructor();
		const batchedMesh = new ExpandingBatchedMesh( instanceCount, instanceCount * vertexCount, instanceCount * indexCount, material );
		batchedMesh.name = 'BatchTilesPlugin';
		batchedMesh.frustumCulled = false;
		tiles.group.add( batchedMesh );
		batchedMesh.updateMatrixWorld();

		// init the array texture render target
		const map = target.material.map;
		const textureOptions = 			{
			colorSpace: map.colorSpace,
			wrapS: map.wrapS,
			wrapT: map.wrapT,
			wrapR: map.wrapS,
			generateMipmaps: map.generateMipmaps,
			// minFilter: map.minFilter,
			magFilter: map.magFilter,
		};

		const arrayTarget = new WebGLArrayRenderTarget( map.image.width, map.image.height, instanceCount );
		Object.assign( arrayTarget.texture, textureOptions );

		// init the material
		material.map = arrayTarget.texture;
		convertMapToArrayTexture( material );

		this.arrayTarget = arrayTarget;
		this.batchedMesh = batchedMesh;

	}

	// render the given into the given layer
	renderTextureToLayer( texture, layer ) {

		this.expandArrayTargetIfNeeded();

		const { renderer } = this;
		const currentRenderTarget = renderer.getRenderTarget();

		// render the layer
		renderer.setRenderTarget( this.arrayTarget, layer );
		_textureRenderQuad.material.map = texture;
		_textureRenderQuad.render( renderer );

		// reset state
		renderer.setRenderTarget( currentRenderTarget );
		_textureRenderQuad.material.map = null;
		texture.dispose();

	}

	// check if the array texture target needs to be expanded
	expandArrayTargetIfNeeded() {

		const { batchedMesh, arrayTarget, renderer } = this;
		if ( batchedMesh.maxInstanceCount > arrayTarget.depth ) {

			// create a new array texture target
			const textureOptions = {
				colorSpace: arrayTarget.texture.colorSpace,
				wrapS: arrayTarget.texture.wrapS,
				wrapT: arrayTarget.texture.wrapT,
				generateMipmaps: arrayTarget.texture.generateMipmaps,
				// minFilter: arrayTarget.texture.minFilter,
				magFilter: arrayTarget.texture.magFilter,
			};

			const newArrayTarget = new WebGLArrayRenderTarget( arrayTarget.width, arrayTarget.height, batchedMesh.maxInstanceCount );
			Object.assign( newArrayTarget.texture, textureOptions );

			// render each old layer into the new texture target
			const currentRenderTarget = renderer.getRenderTarget();
			for ( let i = 0; i < arrayTarget.depth; i ++ ) {

				_layerCopyQuad.material.map = arrayTarget.texture;
				_layerCopyQuad.material.layer = i;
				renderer.setRenderTarget( newArrayTarget, i );
				_layerCopyQuad.render( renderer );

			}

			// reset the state
			renderer.setRenderTarget( currentRenderTarget );
			_layerCopyQuad.material.map = null;

			// replace the old array target
			arrayTarget.dispose();
			batchedMesh.material.map = newArrayTarget.texture;
			this.arrayTarget = newArrayTarget;

		}

	}

	// Override raycasting per tile to defer to the batched mesh
	raycastTile( tile, scene, raycaster, intersects ) {

		if ( ! this._tileToInstanceId.has( tile ) ) {

			return false;

		}

		const instanceId = this._tileToInstanceId.get( tile );
		this.batchedMesh.raycastInstance( instanceId, raycaster, intersects );

		return true;

	}

	dispose() {

		if ( this.arrayTarget ) {

			this.arrayTarget.dispose();

		}

		if ( this.batchedMesh ) {

			this.batchedMesh.material.dispose();
			this.batchedMesh.dispose();
			this.batchedMesh.removeFromParent();

		}

		this.tiles.removeEventListener( 'load-model', this._onLoadModel );
		this.tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );

	}

}
