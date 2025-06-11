import { WebGLRenderTarget, Matrix4, Color, SRGBColorSpace } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { UVRemapper } from './overlays/UVRemapper.js';
import { forEachTileInBounds, getGeometryCartographicRange, getMeshesCartographicRange } from './overlays/utils.js';
import { CesiumIonAuth } from '../../base/auth/CesiumIonAuth.js';

const _matrix = /* @__PURE__ */ new Matrix4();


// init tile overlay via region if available
// init tile overlay via scene when loaded
// assign uvs and draw (delete uvs and dispose geometry?)




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
		this.overlays = overlays;

		// internal
		this.needsUpdate = false;
		this.processQueue = null;
		this.tiles = null;
		this.tileComposer = null;
		this.uvRemapper = null;
		this.scratchTarget = null;
		this.tileInfo = new Map();
		this.overlayInfo = new Map();
		this.usedTextures = new Set();
		this._scheduled = false;

	}

	// plugin functions
	init( tiles ) {

		// init the queue
		const processQueue = new PriorityQueue();
		processQueue.priorityCallback = ( ...args ) => {

			return tiles.downloadQueue.priorityCallback( ...args );

		};

		const tileComposer = new TiledTextureComposer( this.renderer );
		const uvRemapper = new UVRemapper( this.renderer );
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
		this.uvRemapper = uvRemapper;
		this.scratchTarget = scratchTarget;

		// init overlays
		const { overlays, overlayInfo } = this;
		this.overlays = [];
		overlays.forEach( ( overlay, order ) => {

			if ( ! overlayInfo.has( overlay ) ) {

				this.addOverlay( overlay, order );

			}

		} );

		// init all existing tiles
		tiles.forEachLoadedModel( ( scene, tile ) => {

			processQueue.add( tile, async tile => {

				await this._initTileState( scene, tile );
				await this._initOverlays( scene, tile, true );
				this._redrawTileTextures( tile );

			} );

		} );

		// update callback for when overlays have changed
		let execId = 0;
		this._onUpdateAfter = async () => {

			if ( this.needsUpdate ) {

				const { overlays, overlayInfo } = this;
				overlays.sort( ( a, b ) => overlayInfo.get( a ).order - overlayInfo.get( b ).order );
				this.needsUpdate = false;

				// use an exec id to ensure we don't encounter a race condition
				execId ++;
				const id = execId;

				// wait for all overlays to be ready
				const promises = overlays.map( overlay => overlay.whenReady() );
				await Promise.all( promises );

				if ( id === execId ) {

					tiles.forEachLoadedModel( ( scene, tile ) => {

						this._redrawTileTextures( tile );

					} );

				}

			}

		};

		this._onTileDownloadStart = ( { tile } ) => {

			this._initOverlaysFromTileRegion( tile );

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

	}

	disposeTile( tile ) {

		const { processQueue, overlays, tileInfo } = this;

		// reset all state
		this._resetTileOverlay( tile );

		// stop any tile loads
		processQueue.remove( tile );

		// decrement all tile references
		if ( tileInfo.has( tile ) ) {

			const { meshInfo, range, level } = tileInfo.get( tile );
			tileInfo.delete( tile );
			markOverlayImages( range, level, overlays, true );
			meshInfo.forEach( ( { target } ) => target.dispose() );

		}

		if ( tile.boundingVolume.region ) {

			const level = tile.__depthFromRenderedParent - 1;
			const range = tile.boundingVolume.region;
			markOverlayImages( range, level, overlays, true );

		}

	}

	processTileModel( scene, tile ) {

		return this.processQueue.add( tile, async tile => {

			await this._initTileState( scene, tile );
			await this._initOverlays( scene, tile, false );
			this._redrawTileTextures( tile );

		} );

	}

	getAttributions( target ) {

		this.overlays.forEach( overlay => {

			if ( overlay.opacity > 0 ) {

				overlay.getAttributions( target );

			}

		} );

	}

	dispose() {

		// dispose textures
		this.tileComposer.dispose();
		this.uvRemapper.dispose();
		this.scratchTarget.dispose();

		// dispose of all overlays
		const overlays = [ ...this.overlays ];
		overlays.forEach( overlay => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._resetTileOverlay( tile );
			this.disposeTile( tile );

		} );

		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );

	}

	// public
	addOverlay( overlay, order = null ) {

		const { tiles, overlays, overlayInfo } = this;
		overlay.imageSource.fetchOptions = tiles.fetchOptions;
		overlay.init();

		if ( order === null ) {

			order = overlays.length;

		}

		overlays.push( overlay );
		overlayInfo.set( overlay, {
			order: order,
			uniforms: {},
			tileInfo: new Map(),
		} );

		const promises = [];
		tiles.forEachLoadedModel( ( scene, tile ) => {

			promises.push( this._initOverlays( scene, tile, true, overlay ) );

		} );

		this.needsUpdate = false;
		Promise.all( promises ).then( () => {

			this.needsUpdate = true;

		} );

	}

	setOverlayOrder( overlay, order ) {

		const index = this.overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			this.overlayInfo.get( overlay ).order = order;
			this.needsUpdate = true;

		}

	}

	deleteOverlay( overlay ) {

		const index = this.overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			overlay.dispose();
			this.overlays.splice( index, 1 );
			this.overlayInfo.delete( overlay );
			this.needsUpdate = true;

		}

	}

	// new internal
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
			const region = tile.boundingVolume.region;
			await markOverlayImages( region, level, this.overlays, false );
			info.range = region.splice();
			info.level = level;

		}

	}

	async _initTileSceneOverlayInfo( scene, tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			return Promise.all( overlay.map( o => this._initTileSceneOverlayInfo( scene, tile, o ) ) );

		}

		const { tiles, overlayInfo, resolution } = this;
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

			// TODO: draw textures

		} );

	}

	async _updateLayers( scene, tile ) {



	}










	// internal
	// save the state associated with each mesh
	async _initTileState( scene, tile ) {

		const { tiles, tileInfo, resolution } = this;
		const { ellipsoid, group } = tiles;

		// find all meshes to project on
		const meshes = [];
		scene.updateMatrixWorld();
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		const { range, ranges, uvs } = getMeshesCartographicRange( meshes, ellipsoid );


		// TODO: basic geometric error mapping level only
		const level = tile.__depthFromRenderedParent - 1;
		const meshInfo = new Map();
		await Promise.all( meshes.map( async ( mesh, i ) => {

			const { material, geometry } = mesh;
			const { map } = material;
			const range = ranges[ i ];

			// compute the local transform and center of the mesh
			_matrix.copy( mesh.matrixWorld );
			if ( scene.parent ) {

				_matrix.premultiply( group.matrixWorldInverse );

			}

			// get uvs and range
			const { uv } = getGeometryCartographicRange( geometry, _matrix, ellipsoid );
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

		} ) );

		// wait to save the mesh info here so we can use it as an indicator that the textures are ready
		tileInfo.set( tile, {
			range,
			level,
			meshInfo,
		} );

	}

	// start load of all textures in all overlays from a scene
	async _initOverlays( scene, tile, includeTileRegion, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			await Promise.all( overlay.map( o => this._initOverlays( scene, tile, includeTileRegion, o ) ) );
			return;

		}

		const promises = [];
		promises.push( this._initOverlayFromScene( overlay, scene, tile ) );

		// we only need to include the tile region here when initializing from an existing set of tiles or
		if ( includeTileRegion ) {

			promises.push( this._initOverlaysFromTileRegion( tile ) );

		}

		await Promise.all( promises );

	}

	// start load of all texture in all overlays fro ma tile region
	async _initOverlaysFromTileRegion( tile ) {

		if ( tile.boundingVolume.region ) {

			const level = tile.__depthFromRenderedParent - 1;
			const region = tile.boundingVolume.region;
			await markOverlayImages( region, level, this.overlays, false );

		}

	}

	// init the tiles from a single tile and scene
	async _initOverlayFromScene( overlay, scene, tile ) {

		const { tileInfo } = this;
		const { range, level } = tileInfo.get( tile );
		await markOverlayImages( range, level, overlay, false );

	}

	// reset the tile material map
	_resetTileOverlay( tile ) {

		const { tileInfo } = this;
		if ( tileInfo.has( tile ) ) {

			const { meshInfo } = tileInfo.get( tile );
			meshInfo.forEach( ( { map }, mesh ) => {

				mesh.material.map = map;

			} );

		}

	}

	// redraw the tile texture
	_redrawTileTextures( tile ) {

		const { tileComposer, tileInfo, scratchTarget, uvRemapper, overlays, usedTextures } = this;

		// if the tile is not in the mesh info map then the textures are not ready
		if ( ! tileInfo.has( tile ) ) {

			return;

		}

		// reset the meshes
		this._resetTileOverlay( tile );

		// if there are no overlays then don't bother copying texture data.
		// this also doubles as a check for when the plugin has been disposed and async
		// functions are continuing to run.
		if ( overlays.length === 0 ) {

			return;

		}

		const { meshInfo, level } = tileInfo.get( tile );
		meshInfo.forEach( ( info, mesh ) => {

			const { map, range, uv, target } = info;
			const { material, geometry } = mesh;

			// initialize the texture
			tileComposer.setRenderTarget( scratchTarget, range );
			tileComposer.clear( 0xffffff, 0 );

			// draw the textures
			let tileCount = 0;
			overlays.forEach( overlay => {

				forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

					const span = overlay.tiling.getTileBounds( tx, ty, tl );
					const tex = overlay.imageSource.get( tx, ty, tl );
					// if ( tex === null || ! tex.isTexture ) debugger
					// TODO: we getting promises and null here for some reason

					tileCount ++;
					tileComposer.draw( tex, span, overlay.projection, overlay.color, overlay.opacity );
					usedTextures.add( tex );
					this._scheduleCleanup();

				} );

			} );

			// don't use the render target if there are no overlays to apply
			if ( tileCount !== 0 ) {

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

			} else {

				target.dispose();

			}

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
