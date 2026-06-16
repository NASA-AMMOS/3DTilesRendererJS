import { MeshBVH, ObjectBVH, acceleratedRaycast } from 'three-mesh-bvh';

/**
 * Demo plugin that synchronously builds a three-mesh-bvh BVH for every mesh
 * in each loaded tile. Attach the plugin before loading tiles so BVHs are
 * available immediately in processTileModel / load-model callbacks.
 */
export class MeshBVHPlugin {

	constructor() {

		this.name = 'MESH_BVH_PLUGIN';
		this.tiles = null;
		this.objectBvh = null;
		this.needsUpdate = true;

	}

	init( tiles ) {

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

			this.needsUpdate = true;

		};

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );

		this.tiles = tiles;

		tiles.group.raycast = ( ...args ) => {

			if ( this.needsUpdate || ! this.objectBvh ) {

				this.objectBvh = new ObjectBVH( tiles.group );

			}

			this.objectBvh.raycast( ...args );
			return false;

		};

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
