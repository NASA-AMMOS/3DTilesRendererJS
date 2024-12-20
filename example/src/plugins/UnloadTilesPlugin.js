import { estimateBytesUsed } from '../../../src/three/utilities.js';

// Plugin that disposes tiles on unload to remove them from the GPU, saving memory

// TODO:
// - abstract the "tile visible" callback so fade tiles can call it when tiles are _actually_ marked as non-visible
// - add a memory unload function to the tiles renderer that can be called and reacted to by any plugin including BatchedMesh,
// though this may prevent different options. Something like a subfunction that "disposeTile" calls without full disposal.
export class UnloadTilesPlugin {

	constructor() {

		this.name = 'UNLOAD_TILES_PLUGIN';

		this.tiles = null;
		this.estimatedGpuBytes = 0;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._onVisibilityChangeCallback = ( { scene, visible, tile } ) => {

			if ( scene ) {

				const size = estimateBytesUsed( scene );
				this.estimatedGpuBytes += visible ? size : - size;

				if ( ! visible ) {

					tiles.invokeOnePlugin( plugin => plugin.unloadTileFromGPU && plugin.unloadTileFromGPU( scene, tile ) );

				}

			}

		};

		tiles.forEachLoadedModel( ( scene, tile ) => {

			const visible = tiles.visibleSet.has( tile );
			this._onVisibilityChangeCallback( { scene, visible } );

		} );

		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChangeCallback );

	}

	unloadTileFromGPU( scene, tile ) {

		if ( scene ) {

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

	dispose() {

		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChangeCallback );
		this.estimatedGpuBytes = 0;

	}

}
