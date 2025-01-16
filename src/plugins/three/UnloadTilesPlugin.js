import { LRUCache } from '../../utilities/LRUCache.js';

// Plugin that disposes tiles on unload to remove them from the GPU, saving memory

// TODO:
// - abstract the "tile visible" callback so fade tiles can call it when tiles are _actually_ marked as non-visible
export class UnloadTilesPlugin {

	set delay( v ) {

		this.deferCallbacks.delay = v;

	}

	get delay() {

		return this.deferCallbacks.delay;

	}

	set bytesTarget( v ) {

		this.lruCache.minBytesSize = v;

	}

	get bytesTarget() {

		return this.lruCache.minBytesSize;

	}

	get estimatedGpuBytes() {

		return this.lruCache.cachedBytes;

	}

	constructor( options = {} ) {

		const {
			delay = 0,
			bytesTarget = 0,
		} = options;

		this.name = 'UNLOAD_TILES_PLUGIN';

		this.tiles = null;
		this.lruCache = new LRUCache();
		this.deferCallbacks = new DeferCallbackManager();

		this.delay = delay;
		this.bytesTarget = bytesTarget;

	}

	init( tiles ) {

		this.tiles = tiles;

		const { lruCache, deferCallbacks } = this;
		deferCallbacks.callback = tile => {

			lruCache.markUnused( tile );
			lruCache.scheduleUnload( false );

		};

		const unloadCallback = tile => {

			const scene = tile.cached.scene;
			const visible = tiles.visibleTiles.has( tile );

			if ( ! visible ) {

				tiles.invokeOnePlugin( plugin => plugin.unloadTileFromGPU && plugin.unloadTileFromGPU( scene, tile ) );

			}

		};

		this._onUpdateBefore = () => {

			// update lruCache in "update" in case the callback values change
			lruCache.unloadPriorityCallback = tiles.lruCache.unloadPriorityCallback;
			lruCache.computeMemoryUsageCallback = tiles.lruCache.computeMemoryUsageCallback;
			lruCache.minSize = Infinity;
			lruCache.maxSize = Infinity;
			lruCache.maxBytesSize = Infinity;
			lruCache.unloadPercent = 1;
			lruCache.autoMarkUnused = false;

		};

		this._onVisibilityChangeCallback = ( { tile, visible } ) => {

			if ( visible ) {

				lruCache.add( tile, unloadCallback );
				tiles.markTileUsed( tile );
				deferCallbacks.cancel( tile );

			} else {

				deferCallbacks.run( tile );

			}

		};

		tiles.forEachLoadedModel( ( scene, tile ) => {

			const visible = tiles.visibleTiles.has( tile );
			this._onVisibilityChangeCallback( { scene, visible } );

		} );

		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChangeCallback );
		tiles.addEventListener( 'update-before', this._onUpdateBefore );

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
		this.tiles.removeEventListener( 'update-before', this._onUpdateBefore );
		this.deferCallbacks.cancelAll();

	}

}

// Manager for running callbacks after a certain amount of time
class DeferCallbackManager {

	constructor( callback = () => {} ) {

		this.map = new Map();
		this.callback = callback;
		this.delay = 0;

	}

	run( tile ) {

		const { map, delay } = this;
		if ( map.has( tile ) ) {

			throw new Error( 'DeferCallbackManager: Callback already initialized.' );

		}

		if ( delay === 0 ) {

			this.callback( tile );

		} else {

			map.set( tile, setTimeout( () => this.callback( tile ), delay ) );

		}

	}

	cancel( tile ) {

		const { map } = this;
		if ( map.has( tile ) ) {

			clearTimeout( map.get( tile ) );
			map.delete( tile );

		}

	}

	cancelAll() {

		this.map.forEach( ( value, tile ) => {

			this.cancel( tile );

		} );

	}

}
