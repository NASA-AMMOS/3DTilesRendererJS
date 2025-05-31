import { WebGLRenderTarget, Matrix4 } from 'three';
import { PriorityQueue } from '../../../utilities/PriorityQueue.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { UVRemapper } from './overlays/UVRemapper.js';
import { forEachTileInBounds, getGeometryRange } from './overlays/utils.js';

const _matrix = /* @__PURE__ */ new Matrix4();
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
		this._overlays = [];

		// internal
		this.needsUpdate = true;
		this.processQueue = null;
		this.tiles = null;
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
		this.processQueue.priorityCallback = tiles.downloadQueue.priorityCallback;
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

			this.processQueue.add( tile, tile => {

				return this.updateTileOverlays( scene, tile );

			} );

		} );

	}

	disposeTile( tile ) {

		const { processQueue, rangeMap, textureMap } = this;
		processQueue.remove( tile );

		textureMap.delete( tile );

		if ( rangeMap.has( tile ) ) {

			const ranges = rangeMap.get( tile );
			rangeMap.delete( tile );
			ranges.forEach( range => {

				const [ minLon, minLat, maxLon, maxLat, level ] = range;
				this._overlays.forEach( ( { overlay } ) => {

					forEachTileInBounds( [ minLon, minLat, maxLon, maxLat ], level, overlay.tiling, ( tx, ty, tl ) => {

						overlay.imageSource.release( tx, ty, tl );

					} );

				} );

			} );

		}

	}

	processTileModel( scene, tile ) {

		return this.processQueue.add( tile, tile => {

			return this.updateTileOverlays( scene, tile );

		} );

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
	updateTileOverlays( scene, tile ) {

		const overlays = this._overlays;
		const { tileComposer, tiles, rangeMap, textureMap, scratchTarget, resolution, uvRemapper } = this;
		const { ellipsoid, group } = tiles;
		scene.updateMatrixWorld();

		// find all meshes to project on
		const meshes = [];
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		// TODO: remove this check
		if ( rangeMap.has( tile ) ) {

			throw new Error();

		}

		const ranges = [];
		rangeMap.set( tile, ranges );

		const textures = new Map();
		textureMap.set( tile, textures );

		// TODO: basic geometric error mapping level only
		const level = tile.__depthFromRenderedParent - 1;
		return Promise.all( meshes.map( async mesh => {

			// TODO: reset tile material

			const { material, geometry } = mesh;
			const { map } = material;

			// save the original applied texture
			textures.set( mesh, map );

			// compute the local transform and center of the mesh
			_matrix.copy( mesh.matrixWorld );
			if ( scene.parent ) {

				_matrix.premultiply( group.matrixWorldInverse );

			}

			// get uvs and range
			const { range, uv } = getGeometryRange( geometry, _matrix, ellipsoid );
			ranges.push( [ ...range, level ] );

			// wait for all textures to load
			await Promise.all( overlays.flatMap( ( { overlay } ) => {

				const promises = [];
				forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

					// TODO: ideally we would fetch the relevant tiles before the mesh had been loaded and parsed so they're ready asap
					promises.push( overlay.imageSource.lock( tx, ty, tl ) );

				} );

				return promises;

			} ) );

			// initialize the texture
			tileComposer.setRenderTarget( scratchTarget, range );

			if ( map ) {

				tileComposer.draw( mesh.material.map, range );

			} else {

				tileComposer.clear( 0xffffff );

			}

			// draw the textures
			overlays.forEach( ( { overlay } ) => {

				forEachTileInBounds( range, level, overlay.tiling, ( tx, ty, tl ) => {

					const span = overlay.imageSource.tiling.getTileBounds( tx, ty, tl );
					const tex = overlay.imageSource.get( tx, ty, tl );
					tex.generateMipmaps = false;
					tileComposer.draw( tex, span, null, overlay.opacity );

				} );

			} );

			// TODO: dispose of this texture on dispose, reuse on reset
			const finalTarget = new WebGLRenderTarget( resolution, resolution, {
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
			} );

			uvRemapper.setRenderTarget( finalTarget );
			uvRemapper.setUVs( uv, geometry.getAttribute( 'uv' ), geometry.index );
			uvRemapper.draw( scratchTarget.texture );
			mesh.material.map = finalTarget.texture;

		} ) );

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
		} = options;
		this.imageSource = null;
		this.opacity = opacity;

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
