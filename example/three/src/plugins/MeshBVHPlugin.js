import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

/**
 * Demo plugin that synchronously builds a three-mesh-bvh BVH for every mesh
 * in each loaded tile. Attach the plugin before loading tiles so BVHs are
 * available immediately in processTileModel / load-model callbacks.
 */
export class MeshBVHPlugin {

	constructor() {

		this.name = 'MESH_BVH_PLUGIN';
		this.tiles = null;

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

		tiles.addEventListener( 'load-model', this._onLoadModel );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );

		this.tiles = tiles;

		tiles.forEachLoadedModel( ( scene ) => {

			this._onLoadModel( { scene } );

		} );

	}

	dispose() {

		const { tiles } = this;
		tiles.removeEventListener( 'load-model', this._onLoadModel );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );

		tiles.forEachLoadedModel( ( scene ) => {

			this._onDisposeModel( { scene } );

		} );

	}

}
