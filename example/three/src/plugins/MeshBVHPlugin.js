import { MeshBVH, ObjectBVH, acceleratedRaycast } from 'three-mesh-bvh';

/**
 * Demo plugin that synchronously builds a three-mesh-bvh BVH for every mesh
 * in each loaded tile & a full-tileset BVH. Attach the plugin before loading
 * tiles so BVHs are available immediately in processTileModel / load-model callbacks.
 */
export class MeshBVHPlugin {

	constructor() {

		this.name = 'MESH_BVH_PLUGIN';
		this.tiles = null;
		this.objectBvh = null;
		this.needsUpdate = true;

	}

	init( tiles ) {

		this.tiles = tiles;

		// events
		this._onLoadModel = ( { scene } ) => {

			scene.traverse( c => {

				if ( c.isMesh ) {

					c.geometry.boundsTree = new MeshBVH( c.geometry );
					c.raycast = acceleratedRaycast;

				}

			} );

		};

		this._onDisposeModel = ( { scene } ) => {

			scene.traverse( c => {

				if ( c.isMesh ) {

					c.geometry.boundsTree = null;

				}

			} );

		};

		this._onVisibilityChange = () => {

			// TODO: a dynamic BVH would be best here to save time & memory thrash
			this.needsUpdate = true;

		};

		// registration
		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );

		// replace the raycast function, re-computing the object bvh if needed
		tiles.group.raycast = ( ...args ) => {

			if ( this.needsUpdate || ! this.objectBvh ) {

				const objects = Array.from( tiles.activeTiles )
					.map( tile => tile.engineData.scene );
				this.objectBvh = new ObjectBVH( objects, {
					matrixWorld: tiles.group.matrixWorld,
				} );
				this.needsUpdate = false;

			}

			this.objectBvh.raycast( ...args );
			return false;

		};

		// initialize existing scenes
		tiles.forEachLoadedModel( ( scene ) => {

			this._onLoadModel( { scene } );

		} );

	}

	dispose() {

		const { tiles } = this;

		// revert to the prototype chain raycast
		delete tiles.group.raycast;

		// remove events
		tiles.removeEventListener( 'load-model', this._onLoadModel );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );
		tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );

		tiles.forEachLoadedModel( ( scene ) => {

			this._onDisposeModel( { scene } );

		} );

	}

}
