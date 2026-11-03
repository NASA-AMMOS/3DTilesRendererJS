/** @import { AppBase, CameraComponent } from 'playcanvas' */
import { Entity, Frustum, Mat4, Plane, Quat, Vec2, Vec3, Vec4 } from 'playcanvas';
import { LoaderUtils, TilesRendererBase } from '3d-tiles-renderer/core';
import { B3DMLoader } from '../loaders/B3DMLoader.js';
import { disposeModel, GLTFLoader } from '../loaders/GLTFLoader.js';
import { TileBoundingVolume } from '../math/TileBoundingVolume.js';

// scratch values to avoid allocations
const _groupInverse = /* @__PURE__ */ new Mat4();
const _viewMatrix = /* @__PURE__ */ new Mat4();
const _clipMatrix = /* @__PURE__ */ new Mat4();
const _clipInverse = /* @__PURE__ */ new Mat4();
const _contentMatrix = /* @__PURE__ */ new Mat4();
const _rtcMatrix = /* @__PURE__ */ new Mat4();
const _corner = /* @__PURE__ */ new Vec4();
const _resolution = /* @__PURE__ */ new Vec2();
const _position = /* @__PURE__ */ new Vec3();
const _rotation = /* @__PURE__ */ new Quat();
const _scale = /* @__PURE__ */ new Vec3();

/**
 * PlayCanvas implementation of the 3D Tiles renderer. Manages tile loading, caching, traversal and
 * the PlayCanvas entity hierarchy. Tile content is loaded through the engine's glTF parser.
 * @extends TilesRendererBase
 * @warn Only `glTF`, `GLB` and `B3DM` content, and `box` and `sphere` bounding volumes are
 * supported.
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

		this._cameraInfo = [];
		this._listeners = new Map();
		this._upRotationMatrix = new Mat4();
		this._bytesUsed = new WeakMap();
		this._warnedBoundingVolume = false;
		this._warnedResolution = false;

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
				const { asset } = root;
				const upAxis = asset && asset.gltfUpAxis || 'y';
				switch ( upAxis.toLowerCase() ) {

					case 'x':
						this._upRotationMatrix.setFromAxisAngle( Vec3.UP, - 90 );
						break;

					case 'y':
						this._upRotationMatrix.setFromAxisAngle( Vec3.RIGHT, 90 );
						break;

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
				frustum: new Frustum(),
				planes: new Array( 6 ).fill( null ).map( () => new Plane() ),
				points: new Array( 8 ).fill( null ).map( () => new Vec3() ),
				isOrthographic: false,
				sseDenominator: - 1, // used if isOrthographic:false
				position: new Vec3(),
				pixelSize: 0, // used if isOrthographic:true
			} );

		}

		// the camera data is stored in the frame of the tileset, the frame of the tile transforms
		// and bounding volumes
		const groupMatrix = group.getWorldTransform();
		_groupInverse.copy( groupMatrix ).invert();

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			const camera = cameras[ i ];
			const info = cameraInfo[ i ];

			// warn once, as the canvas can stay zero sized for a while, such as in a hidden tab
			this._getResolution( camera, _resolution );
			if ( ( _resolution.x === 0 || _resolution.y === 0 ) && ! this._warnedResolution ) {

				this._warnedResolution = true;
				console.warn( 'TilesRenderer: resolution for camera error calculation is not set.' );

			}

			// the last element of the projection matrix is 1 for orthographic, 0 for perspective
			const projection = camera.projectionMatrix;
			const elements = projection.data;
			info.isOrthographic = elements[ 15 ] === 1;

			if ( info.isOrthographic ) {

				// the view width and height are used to populate matrix elements 0 and 5
				const w = 2 / elements[ 0 ];
				const h = 2 / elements[ 5 ];
				info.pixelSize = Math.max( h / _resolution.y, w / _resolution.x );

			} else {

				// the vertical field of view is used to populate matrix element 5
				info.sseDenominator = ( 2 / elements[ 5 ] ) / _resolution.y;

			}

			// the view matrix is derived from the entity rather than read from the camera, whose
			// cached view matrix is only refreshed when the camera renders
			const cameraMatrix = camera.entity.getWorldTransform();
			_viewMatrix.copy( cameraMatrix ).invert();

			// frustum in the frame of the tileset: projection * view * group
			_clipMatrix.mul2( projection, _viewMatrix ).mul( groupMatrix );
			info.frustum.setFromMat4( _clipMatrix );
			for ( let p = 0; p < 6; p ++ ) {

				info.frustum.getPlane( p, info.planes[ p ] );

			}

			// the frustum corners are the clip space cube corners mapped back through the inverse
			_clipInverse.copy( _clipMatrix ).invert();
			let index = 0;
			for ( let x = - 1; x <= 1; x += 2 ) {

				for ( let y = - 1; y <= 1; y += 2 ) {

					for ( let z = - 1; z <= 1; z += 2 ) {

						_clipInverse.transformVec4( _corner.set( x, y, z, 1 ), _corner );
						info.points[ index ++ ].set( _corner.x / _corner.w, _corner.y / _corner.w, _corner.z / _corner.w );

					}

				}

			}

			// camera position in the frame of the tileset
			_groupInverse.transformPoint( cameraMatrix.getTranslation( _position ), info.position );

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

		// tile transforms accumulate down the hierarchy
		const transform = new Mat4();
		if ( tile.transform ) {

			// 3D Tiles matrices are column major, like PlayCanvas
			transform.set( tile.transform );

		}

		if ( parentTile ) {

			transform.mul2( parentTile.engineData.transform, transform );

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
			console.warn( 'TilesRenderer: Tiles without a "box" or "sphere" bounding volume are not displayed.' );

		}

		// Extend the base engineData structure with PlayCanvas-specific fields
		// Base class initializes: scene, metadata, boundingVolume
		tile.engineData.transform = transform;
		tile.engineData.boundingVolume = boundingVolume;
		tile.engineData.container = null;

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

			default:
				throw new Error( `TilesRenderer: Content type "${ fileType }" not supported.` );

		}

		// the base class drops tiles that were unloaded while parsing, so release them here
		const scene = result.scene;
		if ( abortSignal.aborted ) {

			disposeModel( scene, result.container, this.app.assets );
			return;

		}

		// place the model in the tileset, in the same order as three.js: the tile transform, then
		// the RTC_CENTER offset, the up axis correction and the model's own root transform
		_contentMatrix.copy( engineData.transform );
		if ( result.rtcCenter ) {

			const [ x, y, z ] = result.rtcCenter;
			_contentMatrix.mul( _rtcMatrix.setTranslate( x, y, z ) );

		}

		_contentMatrix.mul( this._upRotationMatrix ).mul( scene.getLocalTransform() );
		scene.setLocalPosition( _contentMatrix.getTranslation( _position ) );
		scene.setLocalRotation( _rotation.setFromMat4( _contentMatrix ) );
		scene.setLocalScale( _contentMatrix.getScale( _scale ) );

		engineData.scene = scene;
		engineData.container = result.container;
		engineData.metadata = result;

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const engineData = tile.engineData;
		if ( engineData.scene ) {

			disposeModel( engineData.scene, engineData.container, this.app.assets );
			engineData.scene = null;
			engineData.container = null;
			engineData.metadata = null;
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
			if ( boundingVolume.intersectsFrustum( info.frustum, info.planes, info.points ) ) {

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
