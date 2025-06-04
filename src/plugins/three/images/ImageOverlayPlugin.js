import { WebGLRenderTarget, Matrix4, Color, SRGBColorSpace } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { UVRemapper } from './overlays/UVRemapper.js';
import { forEachTileInBounds, getGeometryCartographicRange } from './overlays/utils.js';

const _matrix = /* @__PURE__ */ new Matrix4();

// Plugin for overlaying tiled image data on top of 3d tiles geometry.
export class ImageOverlayPlugin {

	constructor( options = {} ) {

		const {
			overlays = [],
			resolution = 256,
			renderer = null,
		} = options;

		this.name = 'IMAGE_OVERLAY_PLUGIN';

		// options
		this.renderer = renderer;
		this.resolution = resolution;
		this.overlays = overlays;
		this.activeOverlays = [];

		// internal
		this.needsUpdate = false;
		this.processQueue = null;
		this.tiles = null;
		this.tileComposer = null;
		this.uvRemapper = null;
		this.scratchTarget = null;
		this.tileMeshInfo = new Map();

	}

	// plugin functions
	init( tiles ) {

		this.tiles = tiles;

		// init the queue
		this.processQueue = new PriorityQueue();
		this.processQueue.priorityCallback = tiles.downloadQueue.priorityCallback;

		// init texture renderers
		this.tileComposer = new TiledTextureComposer( this.renderer );
		this.uvRemapper = new UVRemapper( this.renderer );
		this.scratchTarget = new WebGLRenderTarget( this.resolution, this.resolution, {
			depthBuffer: false,
			stencilBuffer: false,
			generateMipmaps: false,
			colorSpace: SRGBColorSpace,
		} );

		// init overlays
		this.overlays.forEach( ( overlay, order ) => {

			this.addOverlay( overlay, order );

		} );
		this.overlays = null;

		// update callback for when overlays have changed
		this._onUpdateAfter = () => {

			if ( this.needsUpdate ) {

				this.activeOverlays.sort( ( a, b ) => {

					return a.order - b.order;

				} );

				tiles.forEachLoadedModel( ( scene, tile ) => {

					this.updateTileOverlays( tile );

				} );

				this.needsUpdate = false;

			}

		};

		// init all existing tiles
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processQueue.add( tile, async tile => {

				await this.initTileOverlays( scene, tile );
				this.updateTileOverlays( tile );

			} );

		} );

		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	disposeTile( tile ) {

		const { processQueue, activeOverlays, tileMeshInfo } = this;

		// reset all state
		this.resetTileOverlay( tile );

		// stop any tile loads
		processQueue.remove( tile );

		// decrement all tile references
		if ( tileMeshInfo.has( tile ) ) {

			const meshInfo = tileMeshInfo.get( tile );
			tileMeshInfo.delete( tile );
			meshInfo.forEach( ( { range, level, target } ) => {

				target.dispose();

				activeOverlays.forEach( async ( { overlay } ) => {

					await overlay.whenReady();

					forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

						overlay.imageSource.release( tx, ty, tl );

					} );

				} );

			} );

		}

	}

	processTileModel( scene, tile ) {

		return this.processQueue.add( tile, async tile => {

			await this.initTileOverlays( scene, tile );
			this.updateTileOverlays( tile );

		} );

	}

	dispose() {

		// dispose textures
		this.tileComposer.dispose();
		this.uvRemapper.dispose();
		this.scratchTarget.dispose();

		// dispose of all overlays
		this.activeOverlays.forEach( ( { overlay } ) => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this.resetTileOverlay( tile );
			this.disposeTile( tile );

		} );

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );


	}

	// public
	addOverlay( overlay, order = null ) {

		const { tiles, activeOverlays } = this;
		overlay.imageSource.fetchOptions = tiles.fetchOptions;
		overlay.imageSource.fetchData = ( url, options ) => {

			tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
			return tiles.invokeOnePlugin( plugin => plugin !== this && plugin.fetchData && plugin.fetchData( url, options ) );

		};

		if ( order === null ) {

			order = activeOverlays.length;

		}

		activeOverlays.push( { overlay, order } );
		this.needsUpdate = true;

	}

	setOverlayOrder( overlay, order ) {

		const index = this.activeOverlays.findIndex( info => info.overlay === overlay );
		if ( index !== - 1 ) {

			this.activeOverlays[ index ].order = order;
			this.needsUpdate = true;

		}

	}

	deleteOverlay( overlay ) {

		const index = this.activeOverlays.findIndex( info => info.overlay === overlay );
		if ( index !== - 1 ) {

			overlay.dispose();
			this.activeOverlays.splice( index, 1 );
			this.needsUpdate = true;

		}

	}

	// internal
	resetTileOverlay( tile ) {

		const { tileMeshInfo } = this;
		if ( tileMeshInfo.has( tile ) ) {

			const meshInfo = tileMeshInfo.get( tile );
			meshInfo.forEach( ( { map }, mesh ) => {

				mesh.material.map = map;

			} );

		}

	}

	async initTileOverlays( scene, tile ) {

		const overlays = this.activeOverlays;
		const { tiles, tileMeshInfo, resolution } = this;
		const { ellipsoid, group } = tiles;

		// find all meshes to project on
		const meshes = [];
		scene.updateMatrixWorld();
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		// TODO: basic geometric error mapping level only
		const level = tile.__depthFromRenderedParent - 1;
		const meshInfo = new Map();
		await Promise.all( meshes.map( async mesh => {

			const { material, geometry } = mesh;
			const { map } = material;

			// compute the local transform and center of the mesh
			_matrix.copy( mesh.matrixWorld );
			if ( scene.parent ) {

				_matrix.premultiply( group.matrixWorldInverse );

			}

			// get uvs and range
			const { range, uv } = getGeometryCartographicRange( geometry, _matrix, ellipsoid );
			meshInfo.set( mesh, {
				range,
				level,
				uv,
				map,
				target: new WebGLRenderTarget(
					resolution, resolution,
					{ depthBuffer: false, stencilBuffer: false, generateMipmaps: false, colorSpace: SRGBColorSpace }
				),
			} );

			// wait for all textures to load
			await Promise.all( overlays.map( async ( { overlay } ) => {

				await overlay.whenReady();

				const promises = [];
				forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

					// TODO: ideally we would fetch the relevant tiles before the mesh had been loaded and parsed so they're ready asap
					promises.push( overlay.imageSource.lock( tx, ty, tl ) );

				} );

				return Promise.all( promises );

			} ) );

		} ) );

		// wait to save the mesh info here so we can use it as an indicator that the textures are ready
		tileMeshInfo.set( tile, meshInfo );

	}

	updateTileOverlays( tile ) {

		const { tileComposer, tileMeshInfo, scratchTarget, uvRemapper, activeOverlays } = this;

		// if the tile is not in the mesh info map then the textures are not ready
		if ( ! tileMeshInfo.has( tile ) ) {

			return;

		}

		// reset the meshes
		this.resetTileOverlay( tile );

		const meshInfo = tileMeshInfo.get( tile );
		meshInfo.forEach( ( info, mesh ) => {

			const { map, level, range, uv, target } = info;
			const { material, geometry } = mesh;

			// initialize the texture
			tileComposer.setRenderTarget( scratchTarget, range );
			tileComposer.clear( 0xffffff, 0 );

			// draw the textures
			activeOverlays.forEach( ( { overlay } ) => {

				forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

					const span = overlay.tiling.getTileBounds( tx, ty, tl );
					const tex = overlay.imageSource.get( tx, ty, tl );
					tileComposer.draw( tex, span, overlay.projection, overlay.color, overlay.opacity );

				} );

			} );

			tileComposer.setRenderTarget( target, range );
			if ( map ) {

				tileComposer.draw( map, range );
				map.dispose();

			} else {

				tileComposer.clear( 0xffffff );

			}

			// adjust the UVs
			uvRemapper.setRenderTarget( target );
			uvRemapper.setUVs( uv, geometry.getAttribute( 'uv' ), geometry.index );
			uvRemapper.draw( scratchTarget.texture );
			material.map = target.texture;

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

		const {
			opacity = 1,
			color = 0xffffff,
		} = options;
		this.imageSource = null;
		this.opacity = opacity;
		this.color = new Color( color );

	}

	whenReady() {

	}

	dispose() {

		this.imageSource.dispose();

	}

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new XYZImageSource( options );
		this._whenReady = this.imageSource.init( options.url );

	}

	whenReady() {

		return this._whenReady;

	}

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new TMSImageSource( options );
		this._whenReady = this.imageSource.init( options.url );

	}

	whenReady() {

		return this._whenReady;

	}

}

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );

		// TODO: need to deal with authentication

	}

}
