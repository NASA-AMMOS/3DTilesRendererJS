import { Vector3, WebGLRenderTarget } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { UVRemapper } from './overlays/UVRemapper.js';

export class ImageOverlayPlugin {

	constructor( options = {} ) {

		const {
			overlays = [],
			resolution = 256,
			renderer = null,
		} = options;

		this.name = 'IMAGE_OVERLAY_PLUGIN';

		this.needsUpdate = true;
		this.processQueue = null;
		this.resolution = resolution;
		this.overlays = overlays;
		this._overlays = [];

		this.tiles = null;
		this.renderer = renderer;
		this.tileComposer = null;
		this.uvRemapper = null;
		this.scratchTarget = null;
		this.rangeMap = new Map();
		this.textureMap = new Map();

	}

	// plugin functions
	init( tiles ) {

		this.tiles = tiles;
		this.processQueue = new PriorityQueue();
		this.processQueue.priorityCallback = tile => Number( tiles.visibleTiles.has( tile ) );
		this.tileComposer = new TiledTextureComposer( this.renderer );
		this.uvRemapper = new UVRemapper( this.renderer );
		this.scratchTarget = new WebGLRenderTarget( this.resolution, this.resolution, {
			depthBuffer: false,
			stencilBuffer: false,
			generateMipmaps: false,
		} );

		this.overlays.forEach( ( overlay, order ) => {

			this.addOverlay( overlay, order );

		} );
		this.overlays = null;

		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processQueue.add( tile => {

				return this.updateTile( scene, tile );

			} );

		} );

	}

	disposeTile( tile ) {

		const { processQueue, rangeMap, textureMap } = this;
		processQueue.remove( tile );

		textureMap.delete( tile );

		const ranges = rangeMap.get( tile );
		rangeMap.delete( tile );
		ranges.forEach( range => {

			const [ minLon, minLat, maxLon, maxLat, level ] = range;
			this._overlays.forEach( ( { overlay } ) => {

				const minTile = overlay.tiling.getTileAtPoint( minLon, minLat, level );
				const maxTile = overlay.tiling.getTileAtPoint( maxLon, maxLat, level );
				if ( overlay.tiling.flipY ) {

					[ minTile[ 1 ], maxTile[ 1 ] ] = [ maxTile[ 1 ], minTile[ 1 ] ];

				}

				for ( let x = minTile[ 0 ], lx = maxTile[ 0 ]; x <= lx; x ++ ) {

					for ( let y = minTile[ 1 ], ly = maxTile[ 1 ]; y <= ly; y ++ ) {

						if ( overlay.imageSource.tiling.getTileExists( x, y, level ) ) {

							overlay.imageSource.release( x, y, level );

						}

					}

				}

			} );

		} );

	}

	processTileModel( scene, tile ) {

		return this.updateTile( scene, tile );

	}

	dispose() {

		this.tileComposer.dispose();

		this.uvRemapper.dispose();

		this.scratchTarget.dispose();

		this._overlays.forEach( ( { overlay } ) => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			const textures = this.textureMap.get( tile );
			scene.traverse( c => {

				if ( textures.has( c ) ) {

					c.material.map = textures.get( c );

				}

			} );

			this.disposeTile( tile );

		} );

	}

	// public
	addOverlay( overlay, order ) {

		const { tiles } = this;
		overlay.imageSource.fetchOptions = tiles.fetchOptions;
		overlay.imageSource.fetchData = ( url, options ) => {

			tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
			return tiles.invokeOnePlugin( plugin => plugin !== this && plugin.fetchData && plugin.fetchData( url, options ) );

		};

		this._overlays.push( { overlay, order } );
		this.needsUpdate = true;

	}

	setOverlayOrder( overlay, order ) {

		const index = this._overlays.findIndex( info => info.overlay === overlay );
		this._overlays[ index ].order = order;
		this.needsUpdate = true;

	}

	deleteOverlay( overlay ) {

		overlay.dispose();

		const index = this._overlays.findIndex( info => info.overlay === overlay );
		this._overlays.splice( index, 1 );
		this.needsUpdate = true;

	}

	// internal
	updateTile( scene, tile ) {

		const _vec = new Vector3();
		const _cart = {};
		const overlays = this._overlays;
		const { tileComposer, tiles, rangeMap, textureMap, scratchTarget } = this;
		const { ellipsoid, group } = tiles;
		scene.updateMatrixWorld();

		// find all meshes to project on
		const meshes = [];
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		if ( rangeMap.has( tile ) ) {

			throw new Error();

		}

		const ranges = [];
		rangeMap.set( tile, ranges );

		const textures = new Map();
		textureMap.set( tile, textures );


		// basic geometric error mapping level only
		const level = tile.__depthFromRenderedParent - 1;
		const promises = meshes.map( async mesh => {

			textures.set( mesh, mesh.material.map );

			// create a mirror geometry we can use for custom uvs
			const mirror = mesh.clone();
			mirror.geometry = mirror.geometry.clone();

			if ( scene.parent ) {

				mirror.matrixWorld.premultiply( group.matrixWorldInverse );

			}

			mirror.matrixWorld.decompose( mirror.position, mirror.rotation, mirror.scale );
			mirror.geometry.computeBoundingBox();
			mirror.geometry.boundingBox.getCenter( _vec ).applyMatrix4( mirror.matrixWorld );

			// find a rough mid lat / lon point
			ellipsoid.getPositionToCartographic( _vec, _cart );
			const centerLat = _cart.lat;
			const centerLon = _cart.lon;

			// find the lat / lon ranges
			let minLat = Infinity;
			let minLon = Infinity;
			let maxLat = - Infinity;
			let maxLon = - Infinity;

			const newUvs = [];
			const posAttr = mirror.geometry.getAttribute( 'position' );
			for ( let i = 0; i < posAttr.count; i ++ ) {

				// get the lat / lon values per vertex
				_vec.fromBufferAttribute( posAttr, i ).applyMatrix4( mirror.matrixWorld );
				ellipsoid.getPositionToCartographic( _vec, _cart );
				newUvs.push( _cart.lon, _cart.lat );

				// ensure we're not wrapping on the same geometry
				if ( Math.abs( centerLon - _cart.lon ) > Math.PI ) {

					_cart.lon += Math.sign( centerLon - _cart.lon ) * Math.PI * 2;

				}

				if ( Math.abs( centerLat - _cart.lat ) > Math.PI ) {

					_cart.lat += Math.sign( centerLat - _cart.lat ) * Math.PI * 2;

				}

				// save the min and max values
				minLat = Math.min( minLat, _cart.lat );
				maxLat = Math.max( maxLat, _cart.lat );

				minLon = Math.min( minLon, _cart.lon );
				maxLon = Math.max( maxLon, _cart.lon );

			}

			// remap the uvs
			const lonRange = maxLon - minLon;
			const latRange = maxLat - minLat;
			for ( let i = 0; i < newUvs.length; i += 2 ) {

				newUvs[ i + 0 ] -= minLon;
				newUvs[ i + 0 ] /= lonRange;

				newUvs[ i + 1 ] -= minLat;
				newUvs[ i + 1 ] /= latRange;

			}

			ranges.push( [ minLon, minLat, maxLon, maxLat, level ] );

			// preload the textures
			const promises = [];
			overlays.forEach( ( { overlay } ) => {

				const [ minX, minY, maxX, maxY ] = overlay.tiling.getTilesInRange( minLon, minLat, maxLon, maxLat, level );
				for ( let x = minX; x <= maxX; x ++ ) {

					for ( let y = minY; y <= maxY; y ++ ) {

						if ( overlay.imageSource.tiling.getTileExists( x, y, level ) ) {

							promises.push( overlay.imageSource.lock( x, y, level ) );

						}

					}

				}

			} );

			await Promise.all( promises );

			tileComposer.setRenderTarget( scratchTarget, [ minLon, minLat, maxLon, maxLat ] );
			tileComposer.draw( mesh.material.map, [ minLon, minLat, maxLon, maxLat ] );

			overlays.forEach( ( { overlay } ) => {

				const [ minX, minY, maxX, maxY ] = overlay.tiling.getTilesInRange( minLon, minLat, maxLon, maxLat, level );
				for ( let x = minX; x <= maxX; x ++ ) {

					for ( let y = minY; y <= maxY; y ++ ) {

						if ( overlay.imageSource.tiling.getTileExists( x, y, level ) ) {

							const span = overlay.imageSource.tiling.getTileBounds( x, y, level );

							console.log( [ minLon, minLat, maxLon, maxLat ], span );

							const tex = overlay.imageSource.get( x, y, level );
							tileComposer.draw( tex, span, null, 0.5 );

						}

					}

				}

			} );

			// TODO: dispose of this texture on dispose, reuse on reset
			const finalTarget = new WebGLRenderTarget( this.resolution, this.resolution, {
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
			} );

			this.uvRemapper.setRenderTarget( finalTarget );
			this.uvRemapper.setUVs( newUvs, mirror.geometry.getAttribute( 'uv' ), mirror.geometry.index );
			this.uvRemapper.setUVs( mirror.geometry.attributes.uv, mirror.geometry.attributes.uv, mirror.geometry.index );
			this.uvRemapper.draw( scratchTarget.texture );

			mesh.material.map = finalTarget.texture;

		} );

		return Promise.all( promises );

	}

}

class ImageOverlay {

	get tiling() {

		return this.imageSource.tiling;

	}

	get projection() {

		return this.tiling.projection;

	}

	constructor( options = {} ) {

		this.imageSource = null;

	}

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new XYZImageSource( options );
		this.imageSource.init( options.url );

	}

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new TMSImageSource( options );
		this.imageSource.init( options.url );

	}

}

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );

		// TODO: need to deal with authentication

	}

}
