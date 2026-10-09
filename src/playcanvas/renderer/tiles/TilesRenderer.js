/** @import { AppBase, CameraComponent } from 'playcanvas' */
import { Entity, Quat, Vec2, Vec3 } from 'playcanvas';
import { LoaderUtils, TilesRendererBase } from '3d-tiles-renderer/core';
import { B3DMLoader } from '../loaders/B3DMLoader.js';
import { disposeModel, GLTFLoader } from '../loaders/GLTFLoader.js';
import { CameraFrustum } from '../math/CameraFrustum.js';
import { Ellipsoid, WGS84_ELLIPSOID } from '../math/Ellipsoid.js';
import {
	composeMatrix,
	copyMatrix,
	createMatrix,
	decomposeMatrix,
	invertMatrix,
	makeRotationX,
	makeRotationY,
	makeTranslation,
	multiplyMatrices,
} from '../math/MatrixUtils.js';
import { TileBoundingVolume } from '../math/TileBoundingVolume.js';

// scratch values to avoid allocations
const _groupMatrix = /* @__PURE__ */ createMatrix();
const _groupInverse = /* @__PURE__ */ createMatrix();
const _cameraMatrix = /* @__PURE__ */ createMatrix();
const _viewMatrix = /* @__PURE__ */ createMatrix();
const _clipMatrix = /* @__PURE__ */ createMatrix();
const _contentMatrix = /* @__PURE__ */ createMatrix();
const _localMatrix = /* @__PURE__ */ createMatrix();
const _placedMatrix = /* @__PURE__ */ createMatrix();
const _resolution = /* @__PURE__ */ new Vec2();
const _position = /* @__PURE__ */ new Vec3();
const _rotation = /* @__PURE__ */ new Quat();
const _scale = /* @__PURE__ */ new Vec3();

/**
 * PlayCanvas implementation of the 3D Tiles renderer. Manages tile loading, caching, traversal and
 * the PlayCanvas entity hierarchy. Tile content is loaded through the engine's glTF parser.
 *
 * Tile transforms and bounding volumes are kept in 64-bit numbers, and only the final per-tile
 * transform is written into the entity hierarchy, because PlayCanvas matrices are 32-bit. To move
 * a tileset by a large distance, such as bringing an Earth-centered tileset to the origin, use
 * {@link TilesRenderer#setTilesetTransform} rather than transforming {@link TilesRenderer#group}.
 * @extends TilesRendererBase
 * @warn Only `glTF`, `GLB` and `B3DM` content and `box` and `sphere` bounding volumes are supported.
 */
export class TilesRenderer extends TilesRendererBase {

	/**
	 * @param {string} url - URL of the root tileset JSON.
	 * @param {AppBase} app - The PlayCanvas application to create the tiles for.
	 */
	constructor( url, app ) {

		super( url );

		/**
		 * The PlayCanvas application the tiles are created for.
		 * @type {AppBase}
		 */
		this.app = app;

		/**
		 * Root entity that all visible tiles are parented to. Add it to the scene hierarchy, and
		 * transform it to place the tileset.
		 * @type {Entity}
		 */
		this.group = new Entity( 'tiles-root', app );

		/**
		 * Cameras used to calculate the screen space error and visibility of tiles. Use
		 * {@link TilesRenderer#setCamera} and {@link TilesRenderer#deleteCamera} to change it.
		 * @type {Array<CameraComponent>}
		 */
		this.cameras = [];

		/**
		 * Options passed to the `container` asset of every tile, such as glTF parser callbacks.
		 * @type {Object|null}
		 */
		this.assetOptions = null;

		/**
		 * Options passed to the render components created for every tile, such as `castShadows`
		 * or `layers`.
		 * @type {Object|null}
		 */
		this.renderOptions = null;

		/**
		 * The ellipsoid the tileset is on, used for geographic placement. Set from the
		 * `3DTILES_ellipsoid` extension of the tileset, and WGS84 otherwise.
		 * @type {Ellipsoid}
		 */
		this.ellipsoid = new Ellipsoid().copy( WGS84_ELLIPSOID );

		this._cameraInfo = [];
		this._listeners = new Map();
		this._tilesetTransform = createMatrix();
		this._upRotationMatrix = createMatrix();
		this._bytesUsed = new WeakMap();
		this._warnedBoundingVolume = false;

	}

	/**
	 * Registers a listener for the given event type. The listener receives the event object.
	 * @param {string} type
	 * @param {Function} listener
	 */
	addEventListener( type, listener ) {

		const listeners = this._listeners;
		if ( ! listeners.has( type ) ) {

			listeners.set( type, [] );

		}

		const array = listeners.get( type );
		if ( ! array.includes( listener ) ) {

			array.push( listener );

		}

	}

	/**
	 * @param {string} type
	 * @param {Function} listener
	 * @returns {boolean}
	 */
	hasEventListener( type, listener ) {

		const array = this._listeners.get( type );
		return Boolean( array && array.includes( listener ) );

	}

	/**
	 * Removes a previously registered listener.
	 * @param {string} type
	 * @param {Function} listener
	 */
	removeEventListener( type, listener ) {

		const array = this._listeners.get( type );
		if ( array ) {

			const index = array.indexOf( listener );
			if ( index !== - 1 ) {

				array.splice( index, 1 );

			}

		}

	}

	/**
	 * @param {{ type: string }} event
	 */
	dispatchEvent( event ) {

		const array = this._listeners.get( event.type );
		if ( array ) {

			// copy so listeners can remove themselves while the event is dispatched
			const listeners = array.slice();
			for ( let i = 0, l = listeners.length; i < l; i ++ ) {

				listeners[ i ].call( this, event );

			}

		}

	}

	/**
	 * Alias of {@link TilesRenderer#addEventListener}, matching the PlayCanvas event API.
	 * @param {string} type
	 * @param {Function} listener
	 * @returns {this}
	 */
	on( type, listener ) {

		this.addEventListener( type, listener );
		return this;

	}

	/**
	 * Alias of {@link TilesRenderer#removeEventListener}, matching the PlayCanvas event API.
	 * @param {string} type
	 * @param {Function} listener
	 * @returns {this}
	 */
	off( type, listener ) {

		this.removeEventListener( type, listener );
		return this;

	}

	/**
	 * @param {CameraComponent} camera
	 * @returns {boolean}
	 */
	hasCamera( camera ) {

		return this.cameras.includes( camera );

	}

	/**
	 * Adds a camera used to calculate tile visibility and screen space error. The render
	 * resolution is read every frame: the size of the camera's render target in pixels, or the size
	 * of the canvas in CSS pixels.
	 * @param {CameraComponent} camera
	 * @returns {boolean} False if the camera was already added.
	 */
	setCamera( camera ) {

		if ( this.hasCamera( camera ) ) {

			return false;

		}

		this.cameras.push( camera );
		this.dispatchEvent( { type: 'add-camera', camera } );
		return true;

	}

	/**
	 * @param {CameraComponent} camera
	 * @returns {boolean} False if the camera was not added.
	 */
	deleteCamera( camera ) {

		const index = this.cameras.indexOf( camera );
		if ( index === - 1 ) {

			return false;

		}

		this.cameras.splice( index, 1 );
		this.dispatchEvent( { type: 'delete-camera', camera } );
		return true;

	}

	/**
	 * Sets a transform applied to the whole tileset before it is placed under
	 * {@link TilesRenderer#group}. It is applied in 64-bit precision, so unlike a transform on the
	 * group it can move an Earth-centered tileset, whose coordinates are millions of meters from
	 * the origin, close to the origin without losing precision. Loaded tiles are moved
	 * immediately.
	 * @param {Array<number>|TypedArray} matrix - A column-major 4x4 matrix.
	 */
	setTilesetTransform( matrix ) {

		copyMatrix( matrix, this._tilesetTransform );
		this.forEachLoadedModel( ( scene, tile ) => this._placeModel( tile ) );
		this.dispatchEvent( { type: 'needs-update' } );

	}

	/**
	 * Writes the transform set with {@link TilesRenderer#setTilesetTransform} into `target`.
	 * @param {Array<number>|TypedArray} target
	 * @returns {Array<number>|TypedArray}
	 */
	getTilesetTransform( target ) {

		return copyMatrix( this._tilesetTransform, target );

	}

	/**
	 * Calls the callback for every tile with loaded content.
	 * @param {Function} callback - Called with the tile's entity and the tile.
	 */
	forEachLoadedModel( callback ) {

		this.traverse( tile => {

			const scene = tile.engineData && tile.engineData.scene;
			if ( scene ) {

				callback( scene, tile );

			}

		}, null, false );

	}

	/* Overriden */
	loadRootTileset( ...args ) {

		return super.loadRootTileset( ...args )
			.then( root => {

				// cache the gltf tileset rotation matrix
				const { asset, extensions = {} } = root;
				const upAxis = asset && asset.gltfUpAxis || 'y';
				switch ( upAxis.toLowerCase() ) {

					case 'x':
						makeRotationY( - Math.PI / 2, this._upRotationMatrix );
						break;

					case 'y':
						makeRotationX( Math.PI / 2, this._upRotationMatrix );
						break;

				}

				// update the ellipsoid based on the extension
				if ( '3DTILES_ellipsoid' in extensions ) {

					const ext = extensions[ '3DTILES_ellipsoid' ];
					const { ellipsoid } = this;
					ellipsoid.name = ext.body;
					if ( ext.radii ) {

						ellipsoid.radius.set( ...ext.radii );

					} else {

						ellipsoid.radius.set( 1, 1, 1 );

					}

				}

				return root;

			} );

	}

	prepareForTraversal() {

		const { cameras, group } = this;
		const cameraInfo = this._cameraInfo;

		// scale the array of camera info to match the cameras
		while ( cameraInfo.length > cameras.length ) {

			cameraInfo.pop();

		}

		while ( cameraInfo.length < cameras.length ) {

			cameraInfo.push( {
				frustum: new CameraFrustum(),
				isOrthographic: false,
				sseDenominator: - 1, // used if isOrthographic:false
				position: new Vec3(),
				pixelSize: 0, // used if isOrthographic:true
			} );

		}

		// the camera data is stored in the tileset frame, the frame of the tile transforms and
		// bounding volumes: world = group * tileset transform * tileset frame
		copyMatrix( group.getWorldTransform().data, _groupMatrix );
		multiplyMatrices( _groupMatrix, this._tilesetTransform, _groupMatrix );
		invertMatrix( _groupMatrix, _groupInverse );

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			const camera = cameras[ i ];
			const info = cameraInfo[ i ];

			this._getResolution( camera, _resolution );
			if ( _resolution.x === 0 || _resolution.y === 0 ) {

				console.warn( 'TilesRenderer: resolution for camera error calculation is not set.' );

			}

			// the last element of the projection matrix is 1 for orthographic, 0 for perspective
			const projection = camera.projectionMatrix.data;
			info.isOrthographic = projection[ 15 ] === 1;

			if ( info.isOrthographic ) {

				// the view width and height are used to populate matrix elements 0 and 5
				const w = 2 / projection[ 0 ];
				const h = 2 / projection[ 5 ];
				info.pixelSize = Math.max( h / _resolution.y, w / _resolution.x );

			} else {

				// the vertical field of view is used to populate matrix element 5
				info.sseDenominator = ( 2 / projection[ 5 ] ) / _resolution.y;

			}

			// the view matrix is derived from the entity rather than read from the camera, whose
			// cached view matrix is only refreshed when the camera renders
			copyMatrix( camera.entity.getWorldTransform().data, _cameraMatrix );
			invertMatrix( _cameraMatrix, _viewMatrix );

			// frustum in the tileset frame: projection * view * group
			copyMatrix( projection, _clipMatrix );
			multiplyMatrices( _clipMatrix, _viewMatrix, _clipMatrix );
			multiplyMatrices( _clipMatrix, _groupMatrix, _clipMatrix );
			info.frustum.setFromMatrix( _clipMatrix );

			// camera position in the tileset frame
			multiplyMatrices( _groupInverse, _cameraMatrix, _cameraMatrix );
			info.position.set( _cameraMatrix[ 12 ], _cameraMatrix[ 13 ], _cameraMatrix[ 14 ] );

		}

	}

	update() {

		super.update();

		// check for cameras _after_ base update so we can enable pre-loading the root tileset
		if ( this.cameras.length === 0 && this.root ) {

			let found = false;
			this.invokeAllPlugins( plugin => found = found || Boolean( plugin !== this && plugin.calculateTileViewError ) );
			if ( found === false ) {

				console.warn( 'TilesRenderer: no cameras defined. Cannot update 3d tiles.' );

			}

		}

	}

	preprocessNode( tile, tilesetDir, parentTile = null ) {

		super.preprocessNode( tile, tilesetDir, parentTile );

		// tile transforms accumulate down the hierarchy in 64-bit
		const transform = createMatrix();
		if ( tile.transform ) {

			copyMatrix( tile.transform, transform );

		}

		if ( parentTile ) {

			multiplyMatrices( parentTile.engineData.transform, transform, transform );

		}

		const boundingVolume = new TileBoundingVolume();
		if ( 'sphere' in tile.boundingVolume ) {

			boundingVolume.setSphereData( ...tile.boundingVolume.sphere, transform );

		}

		if ( 'box' in tile.boundingVolume ) {

			boundingVolume.setObbData( tile.boundingVolume.box, transform );

		}

		if ( ! boundingVolume.sphere && ! boundingVolume.obb && ! this._warnedBoundingVolume ) {

			this._warnedBoundingVolume = true;
			console.warn( 'TilesRenderer: Only "box" and "sphere" bounding volumes are supported. Tiles without one are not displayed.' );

		}

		// Extend the base engineData structure with PlayCanvas-specific fields
		// Base class initializes: scene, metadata, boundingVolume
		tile.engineData.transform = transform;
		tile.engineData.boundingVolume = boundingVolume;
		tile.engineData.container = null;
		tile.engineData.placements = null;

	}

	async parseTile( buffer, tile, extension, url, abortSignal ) {

		const engineData = tile.engineData;
		const workingPath = LoaderUtils.getWorkingPath( url );
		const fetchOptions = this.fetchOptions;

		let result = null;
		const fileType = ( LoaderUtils.readMagicBytes( buffer ) || extension ).toLowerCase();
		switch ( fileType ) {

			case 'b3dm': {

				const loader = new B3DMLoader( this.app );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.assetOptions = this.assetOptions;
				loader.renderOptions = this.renderOptions;

				result = await loader.parse( buffer, url );
				break;

			}

			// 3DTILES_content_gltf
			case 'gltf':
			case 'glb': {

				const loader = new GLTFLoader( this.app );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.assetOptions = this.assetOptions;
				loader.renderOptions = this.renderOptions;

				result = await loader.parse( buffer, url );
				break;

			}

			default: {

				result = await this.invokeOnePlugin( plugin => plugin.parseToMesh && plugin.parseToMesh( buffer, tile, extension, url, abortSignal ) );
				break;

			}

		}

		if ( ! result ) {

			throw new Error( `TilesRenderer: Content type "${ fileType }" not supported.` );

		}

		// plugins may return the entity on its own
		if ( result instanceof Entity ) {

			result = { scene: result };

		}

		// place the model in the tileset frame in 64-bit, in the same order as three.js:
		// tile transform * RTC_CENTER * up axis correction * the model's root nodes
		const scene = result.scene;
		copyMatrix( engineData.transform, _contentMatrix );
		if ( result.rtcCenter ) {

			const [ x, y, z ] = result.rtcCenter;
			multiplyMatrices( _contentMatrix, makeTranslation( x, y, z, _localMatrix ), _contentMatrix );

		}

		multiplyMatrices( _contentMatrix, this._upRotationMatrix, _contentMatrix );
		engineData.placements = getModelPlacements( scene, result.gltf, _contentMatrix );
		this._placeModel( tile );

		// wait for extra processing by plugins if needed
		await this.invokeAllPlugins( plugin => {

			return plugin.processTileModel && plugin.processTileModel( scene, tile );

		} );

		// the base class drops tiles that were unloaded while parsing, so release them here
		if ( abortSignal.aborted ) {

			if ( result.container ) {

				disposeModel( scene, result.container, this.app.assets );

			} else {

				scene.destroy();

			}

			return;

		}

		engineData.scene = scene;
		engineData.container = result.container || null;
		engineData.metadata = result;

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const engineData = tile.engineData;
		if ( engineData.scene ) {

			if ( engineData.container ) {

				disposeModel( engineData.scene, engineData.container, this.app.assets );

			} else {

				engineData.scene.destroy();

			}

			engineData.scene = null;
			engineData.container = null;
			engineData.metadata = null;
			engineData.placements = null;
			this._bytesUsed.delete( tile );

		}

	}

	setTileVisible( tile, visible ) {

		const scene = tile.engineData.scene;
		if ( scene ) {

			if ( visible ) {

				this.group.addChild( scene );

			} else if ( scene.parent ) {

				scene.parent.removeChild( scene );

			}

		}

		super.setTileVisible( tile, visible );

	}

	calculateBytesUsed( tile, scene ) {

		const bytesUsed = this._bytesUsed;
		const container = tile.engineData.container;
		if ( ! bytesUsed.has( tile ) && scene && container ) {

			bytesUsed.set( tile, estimateBytesUsed( container ) );

		}

		return bytesUsed.get( tile ) ?? null;

	}

	calculateTileViewError( tile, target ) {

		const engineData = tile.engineData;
		const cameras = this.cameras;
		const cameraInfo = this._cameraInfo;
		const boundingVolume = engineData.boundingVolume;

		let inView = false;
		let inViewError = 0;
		let inViewDistance = Infinity;
		let maxCameraError = 0;
		let minCameraDistance = Infinity;

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			// calculate the camera error
			const info = cameraInfo[ i ];
			let error;
			let distance;
			if ( info.isOrthographic ) {

				error = tile.geometricError / info.pixelSize;
				distance = Infinity;

			} else {

				// avoid dividing 0 by 0 which can result in NaN. If the distance to the tile is
				// 0 then the error should be infinity.
				distance = boundingVolume.distanceToPoint( info.position );
				error = distance === 0 ? Infinity : tile.geometricError / ( distance * info.sseDenominator );

			}

			// Track which camera frustums this tile is in so we can use it
			// to ignore the error calculations for cameras that can't see it
			if ( boundingVolume.intersectsFrustum( info.frustum ) ) {

				inView = true;
				inViewError = Math.max( inViewError, error );
				inViewDistance = Math.min( inViewDistance, distance );

			}

			maxCameraError = Math.max( maxCameraError, error );
			minCameraDistance = Math.min( minCameraDistance, distance );

		}

		if ( inView ) {

			// write the in-camera error and distance parameters
			target.inView = true;
			target.error = inViewError;
			target.distanceFromCamera = inViewDistance;

		} else {

			// otherwise write variables for load priority
			target.inView = false;
			target.error = maxCameraError;
			target.distanceFromCamera = minCameraDistance;

		}

	}

	/**
	 * Disposes the renderer, releasing all loaded tile content and the root entity.
	 */
	dispose() {

		super.dispose();
		this.group.destroy();

	}

	// writes the tile's model placements, combined with the tileset transform, into its entities
	_placeModel( tile ) {

		const placements = tile.engineData.placements;
		for ( let i = 0, l = placements.length; i < l; i ++ ) {

			const { entity, matrix } = placements[ i ];
			multiplyMatrices( this._tilesetTransform, matrix, _placedMatrix );
			decomposeMatrix( _placedMatrix, _position, _rotation, _scale );
			entity.setLocalPosition( _position );
			entity.setLocalRotation( _rotation );
			entity.setLocalScale( _scale );

		}

	}

	_getResolution( camera, target ) {

		const rect = camera.rect;
		const renderTarget = camera.renderTarget;
		if ( renderTarget ) {

			return target.set( renderTarget.width * rect.z, renderTarget.height * rect.w );

		}

		// the canvas resolution is measured in CSS pixels, like the three.js and Babylon.js renderers
		// do, so an error target selects the same detail on any display - this is the pixel ratio
		// GraphicsDevice#resizeCanvas scales the canvas by
		const device = this.app.graphicsDevice;
		const pixelRatio = typeof window !== 'undefined' ? Math.min( device.maxPixelRatio, window.devicePixelRatio ) : 1;
		return target.set( device.width / pixelRatio * rect.z, device.height / pixelRatio * rect.w );

	}

}

// Returns the entities that place a loaded model in the tileset frame, each paired with its 64-bit
// matrix: the content matrix times the transform of the glTF node it was instantiated from. The
// node transforms are read from the glTF JSON, as the parser stores them in 32-bit, which cannot
// hold Earth-centered offsets. This mirrors how the PlayCanvas glTF parser builds the hierarchy: a
// single scene with a single node is instantiated as that node, otherwise every scene becomes an
// identity wrapper of its nodes, under an identity root when there are several scenes.
function getModelPlacements( scene, gltf, contentMatrix ) {

	const placements = [];
	const addPlacement = ( entity, localMatrix ) => {

		if ( entity ) {

			placements.push( { entity, matrix: multiplyMatrices( contentMatrix, localMatrix, createMatrix() ) } );

		}

	};

	const scenes = gltf && gltf.scenes;
	if ( ! scenes ) {

		// content created by plugins is placed by the root entity's own transform
		addPlacement( scene, copyMatrix( scene.getLocalTransform().data, _localMatrix ) );

	} else if ( scenes.length === 1 && scenes[ 0 ].nodes && scenes[ 0 ].nodes.length === 1 ) {

		addPlacement( scene, getNodeMatrix( gltf.nodes[ scenes[ 0 ].nodes[ 0 ] ], _localMatrix ) );

	} else {

		// scenes without nodes don't get a wrapper
		const gltfScenes = scenes.filter( gltfScene => gltfScene.nodes );
		const wrappers = gltfScenes.length === 1 ? [ scene ] : scene.children;
		gltfScenes.forEach( ( gltfScene, i ) => {

			gltfScene.nodes.forEach( ( nodeIndex, j ) => {

				addPlacement( wrappers[ i ] && wrappers[ i ].children[ j ], getNodeMatrix( gltf.nodes[ nodeIndex ], _localMatrix ) );

			} );

		} );

	}

	return placements;

}

// the local transform of a glTF node as a 64-bit matrix
function getNodeMatrix( gltfNode, target ) {

	if ( gltfNode.matrix ) {

		return copyMatrix( gltfNode.matrix, target );

	}

	return composeMatrix( gltfNode.translation, gltfNode.rotation, gltfNode.scale, target );

}

// the GPU memory of the meshes and textures created for a model, counting shared buffers once
function estimateBytesUsed( container ) {

	const resource = container.resource;
	if ( ! resource ) {

		return 0;

	}

	// vertex buffers can be shared between meshes, and texture assets between textures
	const buffers = new Set();
	for ( const render of resource.renders || [] ) {

		for ( const mesh of render.resource?.meshes || [] ) {

			if ( mesh ) {

				buffers.add( mesh.vertexBuffer );
				mesh.indexBuffer.forEach( indexBuffer => buffers.add( indexBuffer ) );

			}

		}

	}

	const textures = new Set();
	for ( const texture of resource.textures || [] ) {

		textures.add( texture.resource );

	}

	let bytes = 0;
	buffers.forEach( buffer => {

		bytes += buffer ? buffer.numBytes : 0;

	} );

	textures.forEach( texture => {

		bytes += texture ? texture.gpuSize : 0;

	} );

	return bytes;

}
