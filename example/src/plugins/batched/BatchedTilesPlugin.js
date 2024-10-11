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
			vertexCount: 1000,
			indexCount: 1000,
			expandPercent: 0.25,
			maxExpansionCount: 3, // TODO
			material: null,
			renderer: null,
			...options
		};

		this.name = 'BATCHED_MESH_PLUGIN';

		// save options
		this.instanceCount = options.instanceCount;
		this.vertexCount = options.vertexCount;
		this.indexCount = options.indexCount;
		this.material = options.material ? options.material.clone() : null;
		this.expandPercent = options.expandPercent;
		this.renderer = options.renderer;

		// local variables
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

			// find the meshes in the scene
			const meshes = [];
			scene.traverse( c => {

				if ( c.isMesh ) {

					meshes.push( c );

				}

			} );

			if ( meshes.length === 1 ) {

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

				// add the geometry and an instance to the mesh
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
			generateMipmaps: map.generateMipmaps,
			wrapS: map.wrapS,
			wrapT: map.wrapT,
			minFilter: map.minFilter,
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

		const { batchedMesh, arrayTarget, renderer, material } = this;
		if ( batchedMesh.maxInstanceCount > arrayTarget.depth ) {

			// create a new array texture target
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
			material.map = newArrayTarget.texture;
			this.arrayTarget = newArrayTarget;

		}

	}

	// Override raycasting per tile to defer to the batched mesh
	raycastTile( tile, scene, raycaster, intersects ) {

		if ( ! this._tileMap.has( tile ) ) {

			return false;

		}

		const { instanceId } = this._tileMap.get( tile );
		this.batchedMesh.raycastInstance( instanceId, raycaster, intersects );

		return true;

	}

	dispose() {

		this.arrayTarget.dispose();
		this.batchedMesh.material.dispose();
		this.batchedMesh.dispose();
		this.batchedMesh.removeFromParent();

		this.tiles.removeEventListener( 'load-model', this._onLoadModel );
		this.tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );

	}

}
