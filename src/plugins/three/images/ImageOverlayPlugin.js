import { WebGLRenderTarget, Color, SRGBColorSpace, BufferAttribute } from 'three';
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

function countTilesToDraw( range, level, overlay ) {

	let total = 0;
	forEachTileInBounds( range, level, overlay.tiling, () => {

		total ++;

	} );

	return total;

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
		this.tiles = null;
		this.tileComposer = null;
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

		const tileComposer = new TiledTextureComposer( this.renderer );

		// save variables
		this.tiles = tiles;
		this.tileComposer = tileComposer;

		// init all existing tiles
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processTileModel( scene, tile );

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

				// wait for all overlays to be ready and therefore after all prior work that
				// awaits these promises is ready
				const promises = overlays.map( overlay => overlay.whenReady() );
				await Promise.all( promises );

				if ( id === execId ) {

					// TODO: When a planar projection has been updated, we have to update drawn textures? Uvs?

					// TODO: if the order is the only thing that changes then we don't really need to wait for the above?
					tiles.forEachLoadedModel( ( scene, tile ) => {

						this._updateLayers( tile );

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

		const { overlays, overlayInfo } = this;

		// stop any tile loads
		overlayInfo.forEach( ( ( { tileInfo } ) => {

			if ( tileInfo.has( tile ) ) {

				const { meshInfo, range, meshRange, level, target } = tileInfo.get( tile );

				// release the ranges
				if ( meshRange !== null ) {

					markOverlayImages( meshRange, level, overlays, true );

				}

				if ( range !== null ) {

					markOverlayImages( range, level, overlays, true );

				}

				if ( target !== null ) {

					// release the render targets
					target.dispose();

				}

				tileInfo.delete( tile );
				meshInfo.clear();

			}

		} ) );

	}

	async processTileModel( scene, tile ) {

		this._wrapMaterials( scene );
		this._initTileOverlayInfo( tile );
		await this._initTileSceneOverlayInfo( scene, tile );
		this._updateLayers( tile );

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

			this._updateLayers( tile );
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

			// set the order to the next largest order value
			order = overlays.reduce( ( v, o ) => Math.max( v, o.order + 1 ), 0 );

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
			tileInfo.forEach( ( { meshInfo, target } ) => {

				if ( target !== null ) {

					target.dispose();

				}

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

			this._initTileOverlayInfo( tile, overlay );
			promises.push( this._initTileSceneOverlayInfo( scene, tile, overlay ) );

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

	_initTileOverlayInfo( tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			overlay.forEach( o => this._initTileOverlayInfo( tile, o ) );
			return;

		}

		// This function is resilient to multiple calls in case an overlay is added after a tile starts loading
		// and before it is loaded, meaning this function needs to be called twice to ensure it's initialized.
		if ( this.overlayInfo.get( overlay ).tileInfo.has( tile ) ) {

			return;

		}

		const level = tile.__depthFromRenderedParent - 1;
		const info = {
			range: null,
			meshRange: null,
			level: level,
			target: null,
			meshInfo: new Map(),
		};

		this.overlayInfo
			.get( overlay )
			.tileInfo
			.set( tile, info );

		if ( tile.boundingVolume.region ) {

			const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
			const range = [ minLon, minLat, maxLon, maxLat ];
			info.range = range;

			markOverlayImages( range, level, overlay, false );

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

		// wait for the overlay to be completely loaded so projection and tiling are available
		await overlay.whenReady();
		if ( ! overlayInfo.has( overlay ) ) {

			return;

		}

		const rootMatrix = scene.parent !== null ? tiles.group.matrixWorldInverse : null;
		const { tiling, projection, imageSource } = overlay;
		const { range, uvs } = getMeshesCartographicRange( meshes, ellipsoid, rootMatrix, projection );
		const tileInfo = overlayInfo.get( overlay ).tileInfo.get( tile );

		// if there are no textures to draw in the tiled image set the don't
		// allocate a texture for it.
		let target = null;
		if ( countTilesToDraw( range, tileInfo.level, overlay ) !== 0 ) {

			target = new WebGLRenderTarget( resolution, resolution, {
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
				colorSpace: SRGBColorSpace,
			} );

		}

		tileInfo.meshRange = range;
		tileInfo.target = target;

		meshes.forEach( ( mesh, i ) => {

			const array = new Float32Array( uvs[ i ] );
			const attribute = new BufferAttribute( array, 2 );
			tileInfo.meshInfo.set( mesh, { attribute } );

		} );

		await markOverlayImages( range, tileInfo.level, overlay, false );

		// if the overlay has been removed since the async function start
		// TODO: is there a better way to handle this?
		if ( ! overlayInfo.has( overlay ) ) {

			return;

		}

		// draw the textures
		if ( target !== null ) {

			const clampedRange = tiling.clampToBounds( range );
			const normRange = tiling.toNormalizedRange( clampedRange );
			tileComposer.setRenderTarget( target, normRange );
			tileComposer.clear( 0xffffff, 0 );

			forEachTileInBounds( range, tileInfo.level, tiling, ( tx, ty, tl ) => {

				const span = tiling.getTileBounds( tx, ty, tl, true );
				const tex = imageSource.get( tx, ty, tl );
				tileComposer.draw( tex, span );

				// TODO: this is still failing sometimes
				tex.dispose();

			} );

		}

	}

	_updateLayers( tile ) {

		const { overlayInfo, overlays } = this;
		overlays.forEach( ( overlay, i ) => {

			// if the overlay has been removed before this function is fired then the tile will have been removed.
			// TODO: we should make this more robust
			const { tileInfo } = overlayInfo.get( overlay );
			if ( ! tileInfo.has( tile ) ) {

				return;

			}

			const { meshInfo, target } = tileInfo.get( tile );
			meshInfo.forEach( ( { attribute }, mesh ) => {

				const { geometry, material } = mesh;
				const params = this.meshParams.get( mesh );

				// assign the new uvs
				geometry.dispose();
				geometry.setAttribute( `layer_uv_${ i }`, attribute );

				// set the uniform array lengths
				params.layerMaps.length = overlays.length;
				params.layerColor.length = overlays.length;

				// assign the uniforms
				params.layerMaps.value[ i ] = target !== null ? target.texture : null;
				params.layerColor.value[ i ] = overlay;

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
