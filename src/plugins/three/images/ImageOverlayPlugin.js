import { WebGLRenderTarget, Color, SRGBColorSpace, BufferAttribute } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { forEachTileInBounds, getMeshesCartographicRange } from './overlays/utils.js';
import { CesiumIonAuth } from '../../base/auth/CesiumIonAuth.js';
import { wrapOverlaysMaterial } from './overlays/wrapOverlaysMaterial.js';

// function for marking and releasing images in the given overlay
async function markOverlayImages( range, level, overlay, doRelease ) {

	if ( Array.isArray( overlay ) ) {

		await Promise.all( overlay.map( o => {

			return markOverlayImages( range, level, o, doRelease );

		} ) );
		return;

	}

	await overlay.whenReady();

	const promises = [];
	const { imageSource, tiling } = overlay;
	forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

		if ( doRelease ) {

			imageSource.release( tx, ty, tl );

		} else {

			promises.push( imageSource.lock( tx, ty, tl ) );

		}

	} );

	await Promise.all( promises );

}


// Plugin for overlaying tiled image data on top of 3d tiles geometry.
export class ImageOverlayPlugin {

	constructor( options = {} ) {

		const {
			overlays = [],
			resolution = 256,
			renderer = null,
		} = options;

		this.name = 'IMAGE_OVERLAY_PLUGIN';
		this.priority = 100;

		// options
		this.renderer = renderer;
		this.resolution = resolution;
		this.overlays = [];

		// internal
		this.needsUpdate = false;
		this.processQueue = null;
		this.tiles = null;
		this.tileComposer = null;
		this.scratchTarget = null;
		this.tileInfo = new Map();
		this.overlayInfo = new Map();
		this.usedTextures = new Set();
		this.meshParams = new WeakMap();
		this._scheduled = false;

		overlays.forEach( overlay => {

			this.addOverlay( overlay );

		} );

	}

	// plugin functions
	init( tiles ) {

		// init the queue
		const processQueue = new PriorityQueue();
		processQueue.priorityCallback = ( ...args ) => {

			return tiles.downloadQueue.priorityCallback( ...args );

		};

		const tileComposer = new TiledTextureComposer( this.renderer );
		const scratchTarget = new WebGLRenderTarget( this.resolution, this.resolution, {
			depthBuffer: false,
			stencilBuffer: false,
			generateMipmaps: false,
			colorSpace: SRGBColorSpace,
		} );

		// save variables
		this.tiles = tiles;
		this.processQueue = processQueue;
		this.tileComposer = tileComposer;
		this.scratchTarget = scratchTarget;

		// init all existing tiles
		tiles.forEachLoadedModel( ( scene, tile ) => {

			processQueue.add( tile, async tile => {

				this._wrapMaterials( scene );

				await this._initTileOverlayInfo( tile );
				await this._initTileSceneOverlayInfo( scene, tile );
				this._updateLayers( scene, tile );

			} );

		} );

		// update callback for when overlays have changed
		let execId = 0;
		this._onUpdateAfter = async () => {

			if ( this.needsUpdate ) {

				this.needsUpdate = false;

				const { overlays, overlayInfo } = this;
				overlays.sort( ( a, b ) => {

					return overlayInfo.get( a ).order - overlayInfo.get( b ).order;

				} );

				// use an exec id to ensure we don't encounter a race condition
				execId ++;
				const id = execId;

				// wait for all overlays to be ready
				const promises = overlays.map( overlay => overlay.whenReady() );
				await Promise.all( promises );

				if ( id === execId ) {

					// TODO: update drawn textures

					// TODO: if the order is the only thing that changes then we don't really need to wait for the above?
					tiles.forEachLoadedModel( ( scene, tile ) => {

						this._updateLayers( scene, tile );

					} );

				}

			}

		};

		this._onTileDownloadStart = ( { tile } ) => {

			this._initTileOverlayInfo( tile );

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

		this.overlays.forEach( overlay => {

			this._initOverlay( overlay );

		} );

	}

	disposeTile( tile ) {

		const { processQueue, overlays, overlayInfo } = this;

		// stop any tile loads
		processQueue.remove( tile );

		overlayInfo.forEach( ( ( { tileInfo }, overlay ) => {

			if ( tileInfo.has( tile ) ) {

				const { meshInfo, range, meshRange, level } = tileInfo.get( tile );

				// release the ranges
				if ( meshRange !== null ) {

					markOverlayImages( meshRange, level, overlays, true );

				}

				if ( range !== null ) {

					markOverlayImages( range, level, overlays, true );

				}

				// release the render targets
				meshInfo.forEach( ( { target } ) => {

					target.dispose();

				} );

				tileInfo.delete( tile );
				meshInfo.clear();

			}

		} ) );

	}

	processTileModel( scene, tile ) {

		return this.processQueue.add( tile, async tile => {

			this._wrapMaterials( scene );

			await this._initTileSceneOverlayInfo( scene, tile );
			this._updateLayers( scene, tile );

		} );

	}

	dispose() {

		const { tileComposer, tiles } = this;

		// dispose textures
		tileComposer.dispose();

		// dispose of all overlays
		const overlays = [ ...this.overlays ];
		overlays.forEach( overlay => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._resetTileOverlay( tile );
			this.disposeTile( tile );

		} );

		tiles.removeEventListener( 'update-after', this._onUpdateAfter );

	}

	getAttributions( target ) {

		this.overlays.forEach( overlay => {

			if ( overlay.opacity > 0 ) {

				overlay.getAttributions( target );

			}

		} );

	}

	// public
	addOverlay( overlay, order = null ) {

		const { tiles, overlays, overlayInfo } = this;

		if ( order === null ) {

			// TODO: this should be the largest order value
			order = overlays.length;

		}

		overlays.push( overlay );
		overlayInfo.set( overlay, {
			order: order,
			uniforms: {},
			tileInfo: new Map(),
		} );

		if ( tiles !== null ) {

			this._initOverlay( overlay );

		}

	}

	setOverlayOrder( overlay, order ) {

		const index = this.overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			this.overlayInfo.get( overlay ).order = order;
			this.needsUpdate = true;

		}

	}

	deleteOverlay( overlay ) {

		const { overlays, overlayInfo } = this;
		const index = overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			const { tileInfo } = overlayInfo.get( overlay );
			tileInfo.forEach( ( { meshInfo } ) => {

				meshInfo.forEach( ( { target } ) => {

					target.dispose();

				} );

				meshInfo.clear();

			} );

			tileInfo.clear();
			overlayInfo.delete( overlay );

			overlay.dispose();
			this.overlays.splice( index, 1 );
			this.needsUpdate = true;

		}

	}

	// new internal
	_initOverlay( overlay ) {

		const { tiles } = this;
		overlay.imageSource.fetchOptions = tiles.fetchOptions;
		overlay.init();

		const promises = [];
		tiles.forEachLoadedModel( ( scene, tile ) => {

			promises.push( this.processQueue.add( tile, async () => {

				await this._initTileOverlayInfo( tile, overlay );
				await this._initTileSceneOverlayInfo( scene, tile, overlay );
				this._updateLayers( scene, tile );

			} ) );

		} );

		this.needsUpdate = false;
		Promise.all( promises ).then( () => {

			this.needsUpdate = true;

		} );

	}

	_wrapMaterials( scene ) {

		scene.traverse( c => {

			if ( c.material ) {

				const params = wrapOverlaysMaterial( c.material, c.material.onBeforeCompile );
				this.meshParams.set( c, params );

			}

		} );

	}

	async _initTileOverlayInfo( tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			return Promise.all( overlay.map( o => this._initTileOverlayInfo( tile, o ) ) );

		}

		const info = {
			range: null,
			meshRange: null,
			level: - 1,
			meshInfo: new Map(),
		};

		this.overlayInfo
			.get( overlay )
			.tileInfo
			.set( tile, info );

		if ( tile.boundingVolume.region ) {

			const level = tile.__depthFromRenderedParent - 1;
			const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
			const range = [ minLon, minLat, maxLon, maxLat ];
			await markOverlayImages( range, level, this.overlays, false );

			info.range = range;
			info.level = level;

		}

	}

	async _initTileSceneOverlayInfo( scene, tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			return Promise.all( overlay.map( o => this._initTileSceneOverlayInfo( scene, tile, o ) ) );

		}

		const { tiles, overlayInfo, resolution, tileComposer } = this;
		const { ellipsoid } = tiles;

		// find all meshes to project on
		const meshes = [];
		scene.updateMatrixWorld();
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		const { range, ranges, uvs } = getMeshesCartographicRange( meshes, ellipsoid );
		const tileInfo = overlayInfo.get( overlay ).tileInfo.get( tile );
		tileInfo.meshRange = range;
		meshes.forEach( ( mesh, i ) => {

			tileInfo.meshInfo.set( mesh, {
				range: ranges[ i ],
				uv: uvs[ i ],
				target: new WebGLRenderTarget(
					resolution, resolution,
					{ depthBuffer: false, stencilBuffer: false, generateMipmaps: false, colorSpace: SRGBColorSpace }
				),
			} );

		} );

		await markOverlayImages( range, tileInfo.level, overlay, false );

		// draw the textures
		const { tiling, imageSource } = overlay;
		tileInfo.meshInfo.forEach( ( { target, range } ) => {

			tileComposer.setRenderTarget( target, range );
			tileComposer.clear( 0xffffff, 0 );

			forEachTileInBounds( range, tileInfo.level, tiling, ( tx, ty, tl ) => {

				const span = tiling.getTileBounds( tx, ty, tl );
				const tex = imageSource.get( tx, ty, tl );
				tileComposer.draw( tex, span );

			} );

		} );

	}

	_updateLayers( scene, tile ) {

		const { overlayInfo, overlays } = this;
		overlays.forEach( ( overlay, i ) => {

			const { tileInfo } = overlayInfo.get( overlay );
			const { meshInfo } = tileInfo.get( tile );
			meshInfo.forEach( ( { uv, target }, mesh ) => {

				const { geometry, material } = mesh;
				const params = this.meshParams.get( mesh );

				// assign the new uvs
				geometry.dispose();
				geometry.setAttribute( `layer_uv_${ i }`, new BufferAttribute( new Float32Array( uv ), 2, false ) );

				// set the uniform array lengths
				params.layerMaps.length = overlays.length;
				params.layerInfo.length = overlays.length;

				// assign the uniforms
				params.layerMaps.value[ i ] = target.texture;
				params.layerInfo.value[ i ] = {
					opacity: overlay.opacity,
					tint: overlay.color,
				};

				material.defines.LAYER_COUNT = overlays.length;
				material.needsUpdate = true;

			} );

		} );

	}

	_scheduleCleanup() {

		// clean up textures used for drawing the tile overlays
		if ( ! this._scheduled ) {

			this._scheduled = true;
			requestAnimationFrame( () => {

				const { usedTextures } = this;
				usedTextures.forEach( tex => {

					tex.dispose();

				} );

				usedTextures.clear();
				this._scheduled = false;

			} );

		}

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

	getAttributions( target ) {

	}

	dispose() {

		this.imageSource.dispose();

	}

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new XYZImageSource( options );
		this.url = options.url;

	}

	init() {

		this._whenReady = this.imageSource.init( this.url );

	}

	whenReady() {

		return this._whenReady;

	}

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new TMSImageSource( options );
		this.url = options.url;

	}

	init() {

		this._whenReady = this.imageSource.init( this.url );

	}

	whenReady() {

		return this._whenReady;

	}

}

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );

		const { apiToken, authRefreshToken, assetId } = options;
		this.assetId = assetId;
		this.auth = new CesiumIonAuth( { apiToken, authRefreshToken } );
		this.imageSource = new TMSImageSource( options );

		this.auth.authURL = `https://api.cesium.com/v1/assets/${ assetId }/endpoint`;
		this.imageSource.fetchData = ( ...args ) => this.auth.fetch( ...args );
		this._attributions = [];

	}

	init() {

		this._whenReady = this
			.auth
			.refreshToken()
			.then( json => {

				this._attributions = json.attributions.map( att => ( {
					value: att.html,
					type: 'html',
					collapsible: att.collapsible,
				} ) );
				return this.imageSource.init( json.url );

			} );

	}

	whenReady() {

		return this._whenReady;

	}

	getAttributions( target ) {

		target.push( ...this._attributions );

	}

}
