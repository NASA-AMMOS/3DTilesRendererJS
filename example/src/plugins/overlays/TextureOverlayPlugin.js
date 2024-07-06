import { TextureLoader, ImageBitmapLoader } from 'three';
import { PriorityQueue } from '../../../..';

function canUseImageBitmap() {

	let isSafari = false;
	let isFirefox = false;
	let firefoxVersion = - 1;

	if ( typeof navigator !== 'undefined' ) {

		isSafari = /^((?!chrome|android).)*safari/i.test( navigator.userAgent ) === true;
		isFirefox = navigator.userAgent.indexOf( 'Firefox' ) > - 1;
		firefoxVersion = isFirefox ? navigator.userAgent.match( /Firefox\/([0-9]+)\./ )[ 1 ] : - 1;

	}


	return ! ( typeof createImageBitmap === 'undefined' || isSafari || ( isFirefox && firefoxVersion < 98 ) );

}

class TextureCache {

	constructor( loadTextureCallback, queue ) {

		this.cache = {};
		this.fetchOptions = {};
		this.loadTextureCallback = loadTextureCallback;
		this.queue = queue;

	}

	getTextureLoader() {

		const fetchOptions = this.fetchOptions;

		let loader;
		if ( canUseImageBitmap() ) {

			loader = new ImageBitmapLoader();

		} else {

			loader = new TextureLoader();

		}

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

		const cache = this.cache;
		if ( key in cache ) {

			return cache[ key ].promise;

		}

		const abortController = new AbortController();
		const promise = this.queue
			.add( key, () => {

				return this.loadTextureCallback( key );

			} )
			.then( tex => {

				if ( ! abortController.signal.aborted ) {

					cache[ key ].texture = tex;
					return tex;

				} else {

					throw new Error( 'TextureCache: Texture load aborted.' );

				}

			} );

		this.cache[ key ] = {
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
					this.queue.remove( key );

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
				if ( info.texture.image instanceof ImageBitmap ) {

					info.texture.image.close();

				}

			} else if ( info.abortController ) {

				info.abortController.abort();

			}

		}

	}

}

export class TextureOverlayPlugin {

	constructor( assignCallback ) {

		this.name = 'TEXTURE_OVERLAY_PLUGIN';
		this.caches = null;
		this.queue = null;
		this.tiles = null;
		this.assignCallback = assignCallback;

	}

	// plugin functions
	init( tiles ) {

		this.tiles = tiles;
		this.caches = {};
		this.queue = new PriorityQueue();
		this.queue.priorityCallback = ( a, b ) => {

			return tiles.downloadQueue.priorityCallback( a, b );

		};

		this._disposeModelCallback = ( { tile } ) => {

			const caches = this.caches;
			for ( const key in caches ) {

				const cache = caches[ key ];
				cache.deleteTexture( this.getTileKey( tile ) );

			}

		};

		this._assignTexturesCallback = ( { tile, scene } ) => {

			this.assignCallback( scene, tile, this );

		};

		tiles.addEventListener( 'dispose-model', this._disposeModelCallback );
		tiles.addEventListener( 'load-model', this._assignTexturesCallback );
		tiles.addEventListener( 'layer-textures-change', this._assignTexturesCallback );

	}

	processTileModel( scene, tile ) {

		const caches = this.caches;
		const promises = [];
		for ( const key in caches ) {

			const cache = caches[ key ];
			const pr = cache
				.loadTexture( this.getTileKey( tile ) )
				.catch( () => {} );

			promises.push( pr );

		}

		return Promise.all( promises );

	}

	dispose() {

		const { caches, tiles } = this;
		Object.keys( caches ).forEach( key => {

			this.unregisterLayer( key );

		} );

		tiles.removeEventListener( 'dispose-model', this._disposeModelCallback );
		tiles.removeEventListener( 'load-model', this._assignTexturesCallback );
		tiles.removeEventListener( 'layer-textures-change', this._assignTexturesCallback );

	}

	// public functions
	getTileKey( tile ) {

		return tile.content.uri;

	}

	getTexturesForTile( tile, target = {} ) {

		const tileKey = this.getTileKey( tile );
		const caches = this.caches;
		for ( const key in target ) {

			if ( ! ( key in caches ) ) delete target[ key ];

		}

		for ( const key in caches ) {

			target[ key ] = caches[ key ].getTexture( tileKey );

		}

		return target;

	}

	hasLayer( name ) {

		return name in this.caches;

	}

	registerLayer( name, customTextureCallback ) {

		if ( name in this.caches ) {

			throw new Error( `TextureOverlayPlugin: Texture overlay named ${ name } already exists.` );

		}

		const tiles = this.tiles;
		const cache = new TextureCache( customTextureCallback, this.queue );
		cache.fetchOptions = tiles.fetchOptions;
		this.caches[ name ] = cache;

		tiles.forEachLoadedModel( ( scene, tile ) => {

			cache
				.loadTexture( this.getTileKey( tile ) )
				.then( () => this.assignCallback( scene, tile, this ) )
				.catch( () => {} );

		} );

	}

	unregisterLayer( name ) {

		const tiles = this.tiles;
		const caches = this.caches;
		if ( name in caches ) {

			const cache = caches[ name ];
			delete caches[ name ];

			tiles.forEachLoadedModel( ( scene, tile ) => {

				const texture = cache.getTexture( this.getTileKey( tile ) );
				if ( texture ) {

					this.assignCallback( scene, tile, this );

				}

			} );

			cache.dispose();

		}

	}

}
