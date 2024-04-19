import { Texture, TextureLoader, ImageBitmapLoader } from 'three';

// TODO: Enable TilesRenderer to delay load model events until all textures have loaded
// TODO: Load textures while the tile geometry is loading - can we start this sooner than parse tile?
// TODO: What happens if a tile starts loading and then a layer is added, meaning it's not in the "loaded tiles" callback
// or active function and we haven't caught it in the parseTile function. Additional callback? Store the loading models?

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

	constructor( loadTextureCallback = null ) {

		this.cache = {};
		this.urlResolver = url => url;
		this.fetchOptions = {};

		if ( loadTextureCallback === null ) {

			this.loadTextureCallback = ( url, key ) => {

				const loader = this.getTextureLoader();
				return loader.loadAsync( url ).then( tex => {

					if ( loader.isImageBitmapLoader ) {

						tex = new Texture( tex );
						tex.needsUpdate = true;

					}

					return tex;

				} );

			};

		} else {

			this.loadTextureCallback = loadTextureCallback;

		}

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

			cache[ key ].refs ++;
			return cache[ key ].promise;

		}

		const abortController = new AbortController();
		const promise = this
			.loadTextureCallback( this.urlResolver( key ), key )
			.then( tex => {

				if ( ! abortController.signal.aborted ) {

					cache[ key ].texture = tex;
					return tex;

				} else {

					throw new Error( 'TextureCache: Texture load aborted.' );

				}

			} );

		this.cache[ key ] = {
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
				if ( info.texture.image instanceof ImageBitmap ) {

					info.texture.image.close();

				}

			} else if ( info.abortController ) {

				info.abortController.abort();

			}

		}

	}

}

export const TextureOverlayTilesRendererMixin = base => class extends base {

	constructor( ...args ) {

		super( ...args );
		this.caches = {};
		this.urlResolver = ( name, key ) => null;

		this.addEventListener( 'delete-layer-texture', ( { scene, tile } ) => {

			const textures = this.getTexturesForTile( tile );
			scene.traverse( c => {

				if ( c.material ) {

					c.material.textures = textures;

				}

			} );

		} );

		this.addEventListener( 'load-layer-texture', ( { scene, tile } ) => {

			const textures = this.getTexturesForTile( tile );
			scene.traverse( c => {

				if ( c.material ) {

					c.material.onBeforeCompile = onBeforeCompileCallback;
					c.material.textures = textures;

				}

			} );

		} );

		this.addEventListener( 'load-model', ( { scene, tile } ) => {

			const caches = this.caches;
			for ( const key in caches ) {

				const cache = caches[ key ];
				cache
					.loadTexture( this.getTileKey( tile ) )
					.then( texture => {

						this.dispatchEvent( {
							type: 'load-layer-texture',
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
		return tile.content.uri;

	}

	getTexturesForTile( tile, order = null ) {

		const cacheArray = order ? order.map( name => this.caches[ name ] ).filter( c => c ) : Object.values( this.caches );
		const key = this.getTileKey( tile );

		return cacheArray
			.map( c => c.getTexture( key ) )
			.filter( t => t );

	}

	registerLayer( name, customTextureCallback = null ) {

		if ( name in this.caches ) {

			throw new Error();

		}

		const cache = new TextureCache( customTextureCallback );
		cache.fetchOptions = this.fetchOptions;
		cache.urlResolver = key => {

			return this.urlResolver( name, key );

		};
		this.caches[ name ] = cache;

		this.forEachLoadedModel( ( scene, tile ) => {

			cache
				.loadTexture( this.getTileKey( tile ) )
				.then( texture => {

					this.dispatchEvent( {
						type: 'load-layer-texture',
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
			delete caches[ name ];

			this.forEachLoadedModel( ( scene, tile ) => {

				const texture = cache.getTexture( this.getTileKey( tile ) );
				if ( texture ) {

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

		}

	}

};

function onBeforeCompileCallback( shader ) {

	const textures = this.textures || [];
	shader.defines = {
		TEXTURE_COUNT: textures.length,
	};

	// WebGL does not seem to like empty texture arrays
	if ( textures.length ) {

		shader.uniforms.textures = {
			value: textures,
		};

		shader.fragmentShader = shader.fragmentShader
			.replace( /void main/, m => /* glsl */`
				#if TEXTURE_COUNT != 0
				uniform sampler2D textures[ TEXTURE_COUNT ];
				#endif
				${ m }

			` )
			.replace( /#include <color_fragment>/, m => /* glsl */`

				${ m }

				vec4 col;
				#if TEXTURE_COUNT != 0
				#pragma unroll_loop_start
				for ( int i = 0; i < ${ textures.length }; i ++ ) {

					col = texture( textures[ i ], vMapUv );
					diffuseColor = mix( diffuseColor, col, col.a );

				}
				#pragma unroll_loop_end
				#endif

			` );

	}

	this.customProgramCacheKey = () => {

		return this.textures.length;

	};

	this.onBeforeRender = () => {

		const textures = this.textures || [];
		if ( textures.length !== shader.defines.TEXTURE_COUNT ) {

			shader.defines.TEXTURE_COUNT = textures.length;
			this.needsUpdate = true;

		}

	};

}
