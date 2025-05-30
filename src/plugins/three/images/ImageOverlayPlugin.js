import { Vector3, WebGLRenderTarget } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { ProjectionScheme } from './utils/ProjectionScheme.js';

export class ImageOverlayPlugin {

	constructor( options = {} ) {

		const { overlays = [], renderer = null } = options;

		this.name = 'IMAGE_OVERLAY_PLUGIN';

		this.needsUpdate = true;
		this.processQueue = null;
		this.overlays = overlays;
		this._overlays = [];

		this.tiles = null;
		this.renderer = renderer;
		this.tileComposer = null;
		this.meshMap = new Map();

	}

	// plugin functions
	init( tiles ) {

		this.tiles = tiles;
		this.processQueue = new PriorityQueue();
		this.processQueue.priorityCallback = tile => Number( tiles.visibleTiles.has( tile ) );
		this.tileComposer = new TiledTextureComposer( this.renderer );
		this.overlays.forEach( ( overlay, order ) => {

			this.addOverlay( overlay, order );

		} );
		this.overlays = null;

		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processQueue.add( tile => {

				return this.updateTile( scene, tile );

			} );

		} );

		tiles.addEventListener( 'load-model', ( { scene, tile } ) => {

			this.updateTile( scene, tile );

		} );


	}

	disposeTile( tile ) {

		this.processQueue.remove( tile );

	}

	dispose() {

		this._overlays.forEach( ( { overlay } ) => {

			this.deleteOverlay( overlay );

		} );

		// TODO: reset all tile geometry

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
		const { tileComposer, tiles } = this;
		const { ellipsoid, group } = tiles;
		scene.updateMatrixWorld();

		const meshes = [];
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		const level = tile.__depthFromRenderedParent - 1;
		const mirrorMeshes = meshes.map( async mesh => {

			const mirror = mesh.clone();
			mirror.geometry = mirror.geometry.clone();

			if ( scene.parent ) {

				mirror.matrixWorld.premultiply( group.matrixWorldInverse );

			}

			mirror.matrixWorld.decompose( mirror.position, mirror.rotation, mirror.scale );
			mirror.geometry.computeBoundingBox();
			mirror.geometry.boundingBox.getCenter( _vec ).applyMatrix4( mirror.matrixWorld );

			ellipsoid.getPositionToCartographic( _vec, _cart );
			const centerLat = _cart.lat;
			const centerLon = _cart.lon;

			const posAttr = mirror.geometry.getAttribute( 'position' );
			const uvAttr = mirror.geometry.getAttribute( 'uv' );
			const newUvs = [];
			let minLat = Infinity;
			let minLon = Infinity;
			let maxLat = - Infinity;
			let maxLon = - Infinity;

			for ( let i = 0; i < posAttr.count; i ++ ) {

				_vec.fromBufferAttribute( posAttr, i ).applyMatrix4( mirror.matrixWorld );
				ellipsoid.getPositionToCartographic( _vec, _cart );
				newUvs.push( _cart.lon, _cart.lat );

				if ( Math.abs( centerLon - _cart.lon ) > Math.PI ) {

					_cart.lon += Math.sign( centerLon - _cart.lon ) * Math.PI * 2;

				}

				if ( Math.abs( centerLat - _cart.lat ) > Math.PI ) {

					_cart.lat += Math.sign( centerLat - _cart.lat ) * Math.PI * 2;

				}

				minLat = Math.min( minLat, _cart.lat );
				maxLat = Math.max( maxLat, _cart.lat );

				minLon = Math.min( minLon, _cart.lon );
				maxLon = Math.max( maxLon, _cart.lon );

			}

			const promises = [];
			overlays.forEach( ( { overlay } ) => {

				const minTile = overlay.tiling.getTileAtPoint( minLon, minLat, level );
				const maxTile = overlay.tiling.getTileAtPoint( maxLon, maxLat, level );
				if ( overlay.tiling.flipY ) {

					[ minTile[ 1 ], maxTile[ 1 ] ] = [ maxTile[ 1 ], minTile[ 1 ] ];

				}

				for ( let x = minTile[ 0 ], lx = maxTile[ 0 ]; x <= lx; x ++ ) {

					for ( let y = minTile[ 1 ], ly = maxTile[ 1 ]; y <= ly; y ++ ) {

						// TODO: check if the tiles exist
						promises.push( overlay.imageSource.lock( x, y, level ) );

					}

				}

			} );

			await Promise.all( promises );

			const target = new WebGLRenderTarget( 256, 256 );
			mesh.material.map = target.texture;

			overlays.forEach( ( { overlay } ) => {

				const minTile = overlay.tiling.getTileAtPoint( minLon, minLat, level );
				const maxTile = overlay.tiling.getTileAtPoint( maxLon, maxLat, level );
				if ( overlay.tiling.flipY ) {

					[ minTile[ 1 ], maxTile[ 1 ] ] = [ maxTile[ 1 ], minTile[ 1 ] ];

				}


				if ( tile.level === 2 ) {

					// if ( tile.x < minTile[ 0 ] ) {
						console.log('-------->')
						console.log( minTile[ 0 ], maxTile[ 0 ], tile.x );
						console.log('--------')

						// debugger

					// }





				}

				for ( let x = minTile[ 0 ], lx = maxTile[ 0 ]; x <= lx; x ++ ) {

					for ( let y = minTile[ 1 ], ly = maxTile[ 1 ]; y <= ly; y ++ ) {

						if ( x !== tile.x || y !== tile.y ) continue;

						const span = overlay.imageSource.tiling.getTileBounds( x, y, level );
						const tex = overlay.imageSource.get( x, y, level );
						tileComposer.setRenderTarget( target, [ minLon, minLat, maxLon, maxLat ] );
						tileComposer.draw( tex, span, null, level === 2 );


					}

				}

			} );

			setTimeout( () => {

				this.tiles.dispatchEvent( { type: 'needs-update' } );

			}, 1000 );







		} );

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
