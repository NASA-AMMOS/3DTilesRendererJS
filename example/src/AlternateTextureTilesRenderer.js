import { TextureLoader } from 'three';

// TODO: Enable TilesRenderer to delay load model events until all textures have loaded
// TODO: Load textures while the tile geometry is loading
// TODO: Make sure we fire symmetrical events
// TODO: Add basic overlay support for custom materials w/ opacity blending
// TODO: Add support for toggling layers
// TODO: Make it easier / more clear to get all loaded tiles and associated scene data. Maybe a "forEach" function?
class TextureCache {

	constructor() {

		this.cache = {};
		this.urlResolver = url => url;
		this.fetchOptions = {};

	}

	getTextureLoader() {

		const fetchOptions = this.fetchOptions;
		const loader = new TextureLoader();

		if ( fetchOptions.credentials === 'include' && fetchOptions.mode === 'cors' ) {

			loader.setCrossOrigin( 'use-credentials' );

		}

		if ( 'credentials' in fetchOptions ) {

			loader.setWithCredentials( fetchOptions.credentials === 'include' );

		}

		if ( fetchOptions.headers ) {

			loader.setRequestHeader( fetchOptions.headers );

		}

		return loader;

	}

	loadTexture( key ) {

		const cache = cache;
		if ( key in cache ) {

			cache[ key ].refs ++;
			return cache[ key ].promise;

		}

		const abortController = new AbortController();
		const promise = this.getTextureLoader()
			.loadAsync( this.urlResolver( key ) )
			.then( tex => {

				if ( ! abortController.signal.aborted ) {

					cache[ key ].texture = tex;
					return tex;

				} else {

					throw new Error( 'TextureCache: Texture load aborted.' );

				}

			} );

		this.cache = {
			refs: 1,
			texture: null,
			abortController,
			promise,
		};

		return promise;

	}

	getTexture( key ) {

		const cache = this.cache;
		if ( key in cache ) {

			return cache[ key ].texture;

		} else {

			return null;

		}

	}

	deleteTexture( key ) {

		const cache = this.cache;
		if ( key in cache ) {

			const info = cache[ key ];
			info.refs --;

			if ( info.refs === 0 ) {

				if ( info.texture ) {

					info.texture.dispose();

				} else if ( info.abortController ) {

					info.abortController.abort();

				}

				delete this.cache[ key ];

			}

		}

	}

	dispose() {

		const cache = this.cache;
		for ( const key in cache ) {

			const info = cache[ key ];
			if ( info.texture ) {

				info.texture.dispose();

			} else if ( info.abortController ) {

				info.abortController.abort();

			}

		}

	}

}

export const AlternateTextureTilesRendererMixin = base => class extends base {

	constructor( ...args ) {

		super( ...args );
		this.caches = {};
		this.urlResolver = ( name, key ) => null;

		this.addEventListener( 'load-model', ( { scene, tile } ) => {

			const caches = this.caches;
			for ( const key in caches ) {

				const cache = caches[ key ];
				cache
					.loadTexture( this.getTileKey( tile ) )
					.then( texture => {

						this.dispatchEvent( {
							event: 'load-layer-texture',
							layer: key,
							tile,
							scene,
							texture,
						} );

					} )
					.catch( () => {} );


			}

		} );

		this.addEventListener( 'dispose-model', ( { tile } ) => {

			const caches = this.caches;
			for ( const key in caches ) {

				const cache = caches[ key ];
				cache.deleteTexture( this.getTileKey( tile ) );

			}

		} );

	}

	getTileKey( tile ) {

		// TODO
		return '';

	}

	registerLayer( name ) {

		if ( name in this.caches ) {

			throw new Error();

		}

		const cache = new TextureCache();
		cache.fetchOptions = this.fetchOptions;
		cache.urlResolver = key => {

			return this.urlResolver( name, key );

		};
		this.caches[ name ] = cache;

		this.activeTiles.forEach( tile => {

			const scene = tile.cached.scene;
			cache
				.loadTexture( this.getTileKey( tile ) )
				.then( texture => {

					this.dispatchEvent( {
						event: 'load-layer-texture',
						layer: name,
						tile,
						scene,
						texture,
					} );

				} )
				.catch( () => {} );

		} );

	}

	unregisterLayer( name ) {

		const caches = this.caches;
		if ( name in caches ) {

			const cache = caches[ name ];
			this.activeTiles.forEach( tile => {

				const texture = cache.getTexture( this.getTileKey( tile ) );
				if ( texture ) {

					const scene = tile.cached.scene;
					this.dispatchEvent( {
						type: 'delete-layer-texture',
						layer: name,
						tile,
						scene,
						texture,
					} );

				}

			} );

			cache.dispose();
			delete caches[ name ];

		}

	}

};
