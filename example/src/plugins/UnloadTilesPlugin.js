import { estimateBytesUsed } from '../../../src/three/utilities.js';

// Plugin that disposes tiles on unload to remove them from the GPU, saving memory

// TODO:
// - abstract the "tile visible" callback so fade tiles can call it when tiles are _actually_ marked as non-visible
// - add a memory unload function to the tiles renderer that can be called and reacted to by any plugin including BatchedMesh,
// though this may prevent different options. Something like a subfunction that "disposeTile" calls without full disposal.
// - For BatchedMeshPlugin
//    - Needs flag indicating whether tiles should be fully disposed on upload
//    - Needs to be smarter and reupload if-needed
//    - Raycasting needs to be smarter and raycast against non-uploaded geometry
export class UnloadTilesPlugin {

	constructor( options = {} ) {

		this.tiles = null;
		this.estimatedGpuBytes = 0;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._onVisibilityChangeCallback = ( { scene, visible } ) => {

			if ( scene ) {

				const size = estimateBytesUsed( scene );
				this.estimatedGpuBytes += visible ? size : - size;

				if ( ! visible ) {

					scene.traverse( c => {

						if ( c.material ) {

							const material = c.material;
							material.dispose();

							for ( const key in material ) {

								const value = material[ key ];
								if ( value && value.isTexture ) {

									value.dispose();

								}

							}

						}

						if ( c.geometry ) {

							c.geometry.dispose();

						}

					} );

				}

			}

		};

		tiles.forEachLoadedModel( ( scene, tile ) => {

			const visible = tiles.visibleSet.has( tile );
			this._onVisibilityChangeCallback( { scene, visible } );

		} );

		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChangeCallback );

	}

	dispose() {

		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChangeCallback );
		this.estimatedGpuBytes = 0;

	}

}
