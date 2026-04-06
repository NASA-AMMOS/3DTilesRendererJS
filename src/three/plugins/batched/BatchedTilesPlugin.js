/** @import { WebGLRenderer, Material } from 'three' */
import { WebGLArrayRenderTarget, MeshBasicMaterial, DataTexture, REVISION } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ExpandingBatchedMesh } from './ExpandingBatchedMesh.js';
import { convertMapToArrayTexture, isColorWhite } from './utilities.js';

const _textureRenderQuad = new FullScreenQuad( new MeshBasicMaterial() );
const _whiteTex = new DataTexture( new Uint8Array( [ 255, 255, 255, 255 ] ), 1, 1 );
_whiteTex.needsUpdate = true;

/**
 * Plugin that uses three.js `BatchedMesh` to limit the number of draw calls required and
 * improve performance. The `BatchedMesh` geometry and instance size are automatically resized
 * and optimized as new geometry is added and removed. Note that the `renderer` field is
 * required. Requires Three.js r170 or later.
 *
 * @warn All tile geometry rendered with `BatchedMesh` will use the same material and only a single
 * material map is supported. Only tile geometry containing a single mesh is supported. Not
 * compatible with plugins that modify mesh materials or rely on bespoke mesh data (e.g.
 * `TilesFadePlugin`, `DebugTilesPlugin`, GLTF Metadata extensions).
 * @param {Object} options
 * @param {WebGLRenderer} options.renderer The renderer used to generate a `WebGLArrayRenderTarget`.
 * @param {number} [options.instanceCount=500] Initial number of instances in the batched mesh.
 * @param {number} [options.vertexCount=1000] Minimum vertex space to reserve per tile geometry added.
 * @param {number} [options.indexCount=1000] Minimum index space to reserve per tile geometry added.
 * @param {number} [options.expandPercent=0.25] Fraction by which to grow the mesh when capacity is exceeded.
 * @param {number} [options.maxInstanceCount=Infinity] Hard cap on instance count (clamped to GPU limits).
 * @param {boolean} [options.discardOriginalContent=true] Free the original tile scene after batching. Set to `false` when used with `UnloadTilesPlugin`.
 * @param {number|null} [options.textureSize=null] Override width/height for the texture array; defaults to the first tile's texture size.
 * @param {Material|null} [options.material=null] Custom material for the batched mesh; defaults to the first tile's material type.
 */
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
			discardOriginalContent: true,
			textureSize: null,
			material: null,
			renderer: null,
			...options
		};

		this.name = 'BATCHED_TILES_PLUGIN';
		this.priority = - 1;

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
		this.discardOriginalContent = options.discardOriginalContent;
		this.textureSize = options.textureSize;

		// local variables
		this.batchedMesh = null;
		this.arrayTarget = null;
		this.tiles = null;
		this._tileToInstanceId = new Map();

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	initTextureArray( target ) {

		if ( this.arrayTarget !== null || target.material.map === null ) {

			return;

		}

		const { instanceCount, renderer, textureSize, batchedMesh } = this;

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

		const arrayTarget = new WebGLArrayRenderTarget( textureSize || map.image.width, textureSize || map.image.height, instanceCount );
		Object.assign( arrayTarget.texture, textureOptions );
		renderer.initRenderTarget( arrayTarget );

		// assign the material
		batchedMesh.material.map = arrayTarget.texture;

		this.arrayTarget = arrayTarget;

		// once the texture array is initialized we fill in textures for all previously-initialized instances
		// since they may have been skipped due to not having textures
		this._tileToInstanceId.forEach( value => {

			value.forEach( id => {

				this.assignTextureToLayer( _whiteTex, id );

			} );

		} );

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

		convertMapToArrayTexture( batchedMesh.material );

		this.batchedMesh = batchedMesh;

	}

	setTileVisible( tile, visible ) {

		const scene = tile.engineData.scene;
		if ( visible ) {

			// Add tileset to the batched mesh if it hasn't been added already
			this.addSceneToBatchedMesh( scene, tile );

		}

		if ( this._tileToInstanceId.has( tile ) ) {

			const instanceIds = this._tileToInstanceId.get( tile );
			instanceIds.forEach( instanceId => {

				this.batchedMesh.setVisibleAt( instanceId, visible );

			} );

			// TODO: this should be handled by the base tiles renderer
			const tiles = this.tiles;
			if ( visible ) {

				tiles.visibleTiles.add( tile );

			} else {

				tiles.visibleTiles.delete( tile );

			}

			// dispatch the event that is blocked otherwise
			tiles.dispatchEvent( {
				type: 'tile-visibility-change',
				scene,
				tile,
				visible,
			} );

			return true;

		}

		return false;

	}

	disposeTile( tile ) {

		this.removeSceneFromBatchedMesh( tile );

	}

	unloadTileFromGPU( scene, tile ) {

		if ( ! this.discardOriginalContent && this._tileToInstanceId.has( tile ) ) {

			this.removeSceneFromBatchedMesh( tile );
			return true;

		}

		return false;

	}

	// render the given into the given layer
	assignTextureToLayer( texture, layer ) {

		// if the array target has not been created yet then skip the assignment and expansion
		if ( ! this.arrayTarget ) {

			return;

		}

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

	removeSceneFromBatchedMesh( tile ) {

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

			scene.updateMatrixWorld();

			const instanceIds = [];
			this._tileToInstanceId.set( tile, instanceIds );

			meshes.forEach( mesh => {

				this.initBatchedMesh( mesh );
				this.initTextureArray( mesh );

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


			// discard all data if the option is set
			// TODO: this would be best done in a more general way
			if ( this.discardOriginalContent ) {

				tile.engineData.textures.forEach( tex => {

					if ( tex.image instanceof ImageBitmap ) {

						tex.image.close();

					}

				} );

				tile.engineData.scene = null;
				tile.engineData.materials = [];
				tile.engineData.geometries = [];
				tile.engineData.textures = [];

			}

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

		const { arrayTarget, batchedMesh } = this;
		if ( arrayTarget ) {

			arrayTarget.dispose();

		}

		if ( batchedMesh ) {

			batchedMesh.material.dispose();
			batchedMesh.geometry.dispose();
			batchedMesh.dispose();
			batchedMesh.removeFromParent();

		}

	}

	getTileBatchIds( tile ) {

		return this._tileToInstanceId.get( tile );

	}

}
