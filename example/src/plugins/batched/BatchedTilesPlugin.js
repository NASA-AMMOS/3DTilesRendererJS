import { WebGLArrayRenderTarget, MeshBasicMaterial, Group, DataTexture, REVISION } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ExpandingBatchedMesh } from './ExpandingBatchedMesh.js';
import { convertMapToArrayTexture, isColorWhite } from './utilities.js';

const _textureRenderQuad = new FullScreenQuad( new MeshBasicMaterial() );
const _whiteTex = new DataTexture( new Uint8Array( [ 255, 255, 255, 255 ] ), 1, 1 );
_whiteTex.needsUpdate = true;

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
			maxInstanceCount: Infinity,
			dynamicallyUnloadTiles: false,

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
		this.maxInstanceCount = Math.min( options.maxInstanceCount, gl.getParameter( gl.MAX_3D_TEXTURE_SIZE ) );
		this.renderer = options.renderer;
		this.dynamicallyUnloadTiles = options.dynamicallyUnloadTiles;

		// local variables
		this.batchedMesh = null;
		this.arrayTarget = null;
		this.tiles = null;
		this._onLoadModel = null;
		this._onDisposeModel = null;
		this._onVisibilityChange = null;
		this._tileToInstanceId = new Map();

	}

	setTileVisible( tile, visible ) {

		const scene = tile.cached.scene;
		if ( visible ) {

			this.addSceneToBatchedMesh( scene, tile );

		} else if ( this.dynamicallyUnloadTiles ) {

			this.removeSceneFromBatchedMesh( scene, tile );

		}

		if ( this._tileToInstanceId.has( tile ) ) {

			const instanceIds = this._tileToInstanceId.get( tile );
			instanceIds.forEach( instanceId => {

				this.batchedMesh.setVisibleAt( instanceId, visible );

			} );

			return true;

		}

		return false;

	}

	init( tiles ) {

		this._onDisposeModel = ( { scene, tile } ) => {

			this.removeSceneFromBatchedMesh( scene, tile );

		};

		// register events
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		this.tiles = tiles;

	}

	// init the batched mesh if it's not ready
	initBatchedMesh( target ) {

		if ( this.batchedMesh !== null ) {

			return;

		}

		// init the batched mesh
		const { instanceCount, vertexCount, indexCount, tiles, renderer } = this;
		const material = this.material ? this.material : new target.material.constructor();
		const batchedMesh = new ExpandingBatchedMesh( instanceCount, instanceCount * vertexCount, instanceCount * indexCount, material );
		batchedMesh.name = 'BatchTilesPlugin';
		batchedMesh.frustumCulled = false;
		tiles.group.add( batchedMesh );
		batchedMesh.updateMatrixWorld();

		// init the array texture render target
		const map = target.material.map;
		const textureOptions = {
			colorSpace: map.colorSpace,
			wrapS: map.wrapS,
			wrapT: map.wrapT,
			wrapR: map.wrapS,
			// TODO: Generating mipmaps for the volume every time a new texture is added is extremely slow
			// generateMipmaps: map.generateMipmaps,
			// minFilter: map.minFilter,
			magFilter: map.magFilter,
		};

		const arrayTarget = new WebGLArrayRenderTarget( map.image.width, map.image.height, instanceCount );
		Object.assign( arrayTarget.texture, textureOptions );
		renderer.initRenderTarget( arrayTarget );

		// init the material
		material.map = arrayTarget.texture;
		convertMapToArrayTexture( material );

		this.arrayTarget = arrayTarget;
		this.batchedMesh = batchedMesh;

	}

	// render the given into the given layer
	assignTextureToLayer( texture, layer ) {

		this.expandArrayTargetIfNeeded();

		const { renderer } = this;
		const currentRenderTarget = renderer.getRenderTarget();

		// render the layer
		renderer.setRenderTarget( this.arrayTarget, layer );
		_textureRenderQuad.material.map = texture;
		_textureRenderQuad.render( renderer );

		// TODO: perform a copy if the texture is already the appropriate size

		// reset state
		renderer.setRenderTarget( currentRenderTarget );
		_textureRenderQuad.material.map = null;
		texture.dispose();

	}

	// check if the array texture target needs to be expanded
	expandArrayTargetIfNeeded() {

		const { batchedMesh, arrayTarget, renderer } = this;
		const targetDepth = Math.min( batchedMesh.maxInstanceCount, this.maxInstanceCount );
		if ( targetDepth > arrayTarget.depth ) {

			// create a new array texture target
			const textureOptions = {
				colorSpace: arrayTarget.texture.colorSpace,
				wrapS: arrayTarget.texture.wrapS,
				wrapT: arrayTarget.texture.wrapT,
				generateMipmaps: arrayTarget.texture.generateMipmaps,
				minFilter: arrayTarget.texture.minFilter,
				magFilter: arrayTarget.texture.magFilter,
			};

			const newArrayTarget = new WebGLArrayRenderTarget( arrayTarget.width, arrayTarget.height, targetDepth );
			Object.assign( newArrayTarget.texture, textureOptions );

			// copy the contents
			renderer.initRenderTarget( newArrayTarget );
			renderer.copyTextureToTexture( arrayTarget.texture, newArrayTarget.texture );

			// replace the old array target
			arrayTarget.dispose();
			batchedMesh.material.map = newArrayTarget.texture;
			this.arrayTarget = newArrayTarget;

		}

	}

	removeSceneFromBatchedMesh( scene, tile ) {

		if ( this._tileToInstanceId.has( tile ) ) {

			const instanceIds = this._tileToInstanceId.get( tile );
			this._tileToInstanceId.delete( tile );
			instanceIds.forEach( instanceId => {

				this.batchedMesh.deleteInstance( instanceId );

			} );

		}

	}

	addSceneToBatchedMesh( scene, tile ) {

		if ( this._tileToInstanceId.has( tile ) ) {

			return;

		}

		// find the meshes in the scene
		const meshes = [];
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		// don't add the geometry if it doesn't have the right attributes
		let hasCorrectAttributes = true;
		meshes.forEach( mesh => {

			if ( this.batchedMesh && hasCorrectAttributes ) {

				const attrs = mesh.geometry.attributes;
				const batchedAttrs = this.batchedMesh.geometry.attributes;
				for ( const key in batchedAttrs ) {

					if ( ! ( key in attrs ) ) {

						hasCorrectAttributes = false;
						return;

					}

				}

			}

		} );

		const canAddMeshes = ! this.batchedMesh || this.batchedMesh.instanceCount + meshes.length <= this.maxInstanceCount;
		if ( hasCorrectAttributes && canAddMeshes ) {

			if ( ! this.dynamicallyUnloadTiles ) {

				tile.cached.scene = null;
				tile.cached.materials = [];
				tile.cached.geometries = [];
				tile.cached.textures = [];

			}

			scene.updateMatrixWorld();

			const instanceIds = [];
			meshes.forEach( mesh => {

				this.initBatchedMesh( mesh );

				const { geometry, material } = mesh;
				const { batchedMesh, expandPercent } = this;

				// assign expandPercent in case it has changed
				batchedMesh.expandPercent = expandPercent;

				const geometryId = batchedMesh.addGeometry( geometry, this.vertexCount, this.indexCount );
				const instanceId = batchedMesh.addInstance( geometryId );
				instanceIds.push( instanceId );
				batchedMesh.setMatrixAt( instanceId, mesh.matrixWorld );
				batchedMesh.setVisibleAt( instanceId, false );
				if ( ! isColorWhite( material.color ) ) {

					material.color.setHSL( Math.random(), 0.5, 0.5 );
					batchedMesh.setColorAt( instanceId, material.color );

				}

				// render the material
				const texture = material.map;
				if ( texture ) {

					this.assignTextureToLayer( texture, instanceId );

				} else {

					this.assignTextureToLayer( _whiteTex, instanceId );

				}

			} );

			this._tileToInstanceId.set( tile, instanceIds );

		}

	}

	// Override raycasting per tile to defer to the batched mesh
	raycastTile( tile, scene, raycaster, intersects ) {

		if ( ! this._tileToInstanceId.has( tile ) ) {

			return false;

		}

		const instanceIds = this._tileToInstanceId.get( tile );
		instanceIds.forEach( instanceId => {

			this.batchedMesh.raycastInstance( instanceId, raycaster, intersects );

		} );

		return true;

	}

	dispose() {

		const { arrayTarget, tiles, batchedMesh } = this;
		if ( arrayTarget ) {

			arrayTarget.dispose();

		}

		if ( batchedMesh ) {

			batchedMesh.material.dispose();
			batchedMesh.geometry.dispose();
			batchedMesh.dispose();
			batchedMesh.removeFromParent();

		}

		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );

	}

}
