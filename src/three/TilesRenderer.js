import { TilesRendererBase } from '../base/TilesRendererBase.js';
import { B3DMLoader } from './loaders/B3DMLoader.js';
import { PNTSLoader } from './loaders/PNTSLoader.js';
import { I3DMLoader } from './loaders/I3DMLoader.js';
import { CMPTLoader } from './loaders/CMPTLoader.js';
import { GLTFExtensionLoader } from './loaders/GLTFExtensionLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Vector3,
	Vector2,
	Euler,
	LoadingManager,
	EventDispatcher,
	REVISION,
} from 'three';
import { raycastTraverse, raycastTraverseFirstHit } from './raycastTraverse.js';
import { readMagicBytes } from '../utilities/readMagicBytes.js';
import { TileBoundingVolume } from './math/TileBoundingVolume.js';
import { ExtendedFrustum } from './math/ExtendedFrustum.js';
import { estimateBytesUsed } from './utilities.js';
import { WGS84_ELLIPSOID } from './math/GeoConstants.js';

const _mat = new Matrix4();
const _euler = new Euler();

// In three.js r165 and higher raycast traversal can be ended early
const REVISION_LESS_165 = parseInt( REVISION ) < 165;
const INITIAL_FRUSTUM_CULLED = Symbol( 'INITIAL_FRUSTUM_CULLED' );
const tempMat = new Matrix4();
const tempMat2 = new Matrix4();
const tempVector = new Vector3();
const tempVector2 = new Vector2();

const X_AXIS = new Vector3( 1, 0, 0 );
const Y_AXIS = new Vector3( 0, 1, 0 );

function updateFrustumCulled( object, toInitialValue ) {

	object.traverse( c => {

		c.frustumCulled = c[ INITIAL_FRUSTUM_CULLED ] && toInitialValue;

	} );

}

export class TilesRenderer extends TilesRendererBase {

	get autoDisableRendererCulling() {

		return this._autoDisableRendererCulling;

	}

	set autoDisableRendererCulling( value ) {

		if ( this._autoDisableRendererCulling !== value ) {

			super._autoDisableRendererCulling = value;
			this.forEachLoadedModel( ( scene ) => {

				updateFrustumCulled( scene, ! value );

			} );

		}

	}

	constructor( ...args ) {

		super( ...args );
		this.group = new TilesGroup( this );
		this.ellipsoid = WGS84_ELLIPSOID.clone();
		this.cameras = [];
		this.cameraMap = new Map();
		this.cameraInfo = [];
		this.activeTiles = new Set();
		this.visibleTiles = new Set();
		this.optimizeRaycast = true;
		this._eventDispatcher = new EventDispatcher();
		this._upRotationMatrix = new Matrix4();

		this.lruCache.computeMemoryUsageCallback = tile => tile.cached.bytesUsed ?? null;

		// flag indicating whether frustum culling should be disabled
		this._autoDisableRendererCulling = true;

		// flag indicating whether tiles are actively loading so events can be fired
		this._loadingTiles = false;

		const manager = new LoadingManager();
		manager.setURLModifier( url => {

			if ( this.preprocessURL ) {

				return this.preprocessURL( url );

			} else {

				return url;

			}

		} );
		this.manager = manager;

		if ( REVISION_LESS_165 ) {

			// Setting up the override raycasting function to be used by
			// 3D objects created by this renderer
			const tilesRenderer = this;
			this._overridenRaycast = function ( raycaster, intersects ) {

				if ( ! tilesRenderer.optimizeRaycast ) {

					Object.getPrototypeOf( this ).raycast.call( this, raycaster, intersects );

				}

			};

		}

	}

	addEventListener( ...args ) {

		this._eventDispatcher.addEventListener( ...args );

	}

	hasEventListener( ...args ) {

		this._eventDispatcher.hasEventListener( ...args );

	}

	removeEventListener( ...args ) {

		this._eventDispatcher.removeEventListener( ...args );

	}

	dispatchEvent( ...args ) {

		this._eventDispatcher.dispatchEvent( ...args );

	}

	/* Public API */
	getBounds( ...args ) {

		console.warn( 'TilesRenderer: getBounds has been renamed to getBoundingBox.' );
		return this.getBoundingBox( ...args );

	}

	getOrientedBounds( ...args ) {

		console.warn( 'TilesRenderer: getOrientedBounds has been renamed to getOrientedBoundingBox.' );
		return this.getOrientedBoundingBox( ...args );

	}

	getBoundingBox( target ) {

		if ( ! this.root ) {

			return false;

		}

		const boundingVolume = this.root.cached.boundingVolume;
		if ( boundingVolume ) {

			boundingVolume.getAABB( target );
			return true;

		} else {

			return false;

		}

	}

	getOrientedBoundingBox( targetBox, targetMatrix ) {

		if ( ! this.root ) {

			return false;

		}

		const boundingVolume = this.root.cached.boundingVolume;
		if ( boundingVolume ) {

			boundingVolume.getOBB( targetBox, targetMatrix );
			return true;

		} else {

			return false;

		}

	}

	getBoundingSphere( target ) {

		if ( ! this.root ) {

			return false;

		}

		const boundingVolume = this.root.cached.boundingVolume;
		if ( boundingVolume ) {

			boundingVolume.getSphere( target );
			return true;

		} else {

			return false;

		}

	}

	forEachLoadedModel( callback ) {

		this.traverse( tile => {

			const scene = tile.cached.scene;
			if ( scene ) {

				callback( scene, tile );

			}

		} );

	}

	raycast( raycaster, intersects ) {

		if ( ! this.root ) {

			return;

		}

		if ( raycaster.firstHitOnly ) {

			const hit = raycastTraverseFirstHit( this, this.root, raycaster );
			if ( hit ) {

				intersects.push( hit );

			}

		} else {

			raycastTraverse( this, this.root, raycaster, intersects );

		}

	}

	hasCamera( camera ) {

		return this.cameraMap.has( camera );

	}

	setCamera( camera ) {

		const cameras = this.cameras;
		const cameraMap = this.cameraMap;
		if ( ! cameraMap.has( camera ) ) {

			cameraMap.set( camera, new Vector2() );
			cameras.push( camera );
			this.dispatchEvent( { type: 'add-camera', camera } );

			return true;

		}
		return false;

	}

	setResolution( camera, xOrVec, y ) {

		const cameraMap = this.cameraMap;
		if ( ! cameraMap.has( camera ) ) {

			return false;

		}

		const width = xOrVec.isVector2 ? xOrVec.x : xOrVec;
		const height = xOrVec.isVector2 ? xOrVec.y : y;
		const cameraVec = cameraMap.get( camera );

		if ( cameraVec.width !== width || cameraVec.height !== height ) {

			cameraVec.set( width, height );
			this.dispatchEvent( { type: 'camera-resolution-change' } );

		}

		return true;

	}

	setResolutionFromRenderer( camera, renderer ) {

		renderer
			.getSize( tempVector2 )
			.multiplyScalar( renderer.getPixelRatio() );

		return this.setResolution( camera, tempVector2.x, tempVector2.y );

	}

	deleteCamera( camera ) {

		const cameras = this.cameras;
		const cameraMap = this.cameraMap;
		if ( cameraMap.has( camera ) ) {

			const index = cameras.indexOf( camera );
			cameras.splice( index, 1 );
			cameraMap.delete( camera );
			this.dispatchEvent( { type: 'delete-camera', camera } );

			return true;

		}
		return false;

	}

	/* Overriden */
	preprocessTileSet( json, url, tile ) {

		super.preprocessTileSet( json, url, tile );

		queueMicrotask( () => {

			this.dispatchEvent( {
				type: 'load-tile-set',
				tileSet: json,
				url,
			} );

		} );

	}

	loadRootTileSet( ...args ) {

		return super.loadRootTileSet( ...args )
			.then( () => {

				// cache the gltf tile set rotation matrix
				const upAxis = this.rootTileSet.asset && this.rootTileSet.asset.gltfUpAxis || 'y';
				switch ( upAxis.toLowerCase() ) {

					case 'x':
						this._upRotationMatrix.makeRotationAxis( Y_AXIS, - Math.PI / 2 );
						break;

					case 'y':
						this._upRotationMatrix.makeRotationAxis( X_AXIS, Math.PI / 2 );
						break;

				}

				this.dispatchEvent( { type: 'load-content' } );

			} )
			.catch( () => {} );

	}

	update() {

		// check if the plugins that can block the tile updates require it
		let needsUpdate = null;
		this.invokeAllPlugins( plugin => {

			if ( plugin.doTilesNeedUpdate ) {

				const res = plugin.doTilesNeedUpdate();
				needsUpdate = needsUpdate === null ? res : needsUpdate || res;

			}

		} );

		if ( needsUpdate === false ) {

			this.dispatchEvent( { type: 'update-before' } );
			this.dispatchEvent( { type: 'update-after' } );
			return;

		}

		// follow through with the update
		this.dispatchEvent( { type: 'update-before' } );

		const group = this.group;
		const cameras = this.cameras;
		const cameraMap = this.cameraMap;
		const cameraInfo = this.cameraInfo;

		if ( cameras.length === 0 ) {

			console.warn( 'TilesRenderer: no cameras defined. Cannot update 3d tiles.' );
			return;

		}

		// automatically scale the array of cameraInfo to match the cameras
		while ( cameraInfo.length > cameras.length ) {

			cameraInfo.pop();

		}

		while ( cameraInfo.length < cameras.length ) {

			cameraInfo.push( {

				frustum: new ExtendedFrustum(),
				isOrthographic: false,
				sseDenominator: - 1, // used if isOrthographic:false
				position: new Vector3(),
				invScale: - 1,
				pixelSize: 0, // used if isOrthographic:true

			} );

		}

		// extract scale of group container
		tempMat2.copy( group.matrixWorld ).invert();

		tempVector.setFromMatrixScale( tempMat2 );
		if ( Math.abs( Math.max( tempVector.x - tempVector.y, tempVector.x - tempVector.z ) ) > 1e-6 ) {

			console.warn( 'ThreeTilesRenderer : Non uniform scale used for tile which may cause issues when calculating screen space error.' );

		}

		// store the camera cameraInfo in the 3d tiles root frame
		for ( let i = 0, l = cameraInfo.length; i < l; i ++ ) {

			const camera = cameras[ i ];
			const info = cameraInfo[ i ];
			const frustum = info.frustum;
			const position = info.position;
			const resolution = cameraMap.get( camera );

			if ( resolution.width === 0 || resolution.height === 0 ) {

				console.warn( 'TilesRenderer: resolution for camera error calculation is not set.' );

			}

			// Read the calculated projection matrix directly to support custom Camera implementations
			const projection = camera.projectionMatrix.elements;

			// The last element of the projection matrix is 1 for orthographic, 0 for perspective
			info.isOrthographic = projection[ 15 ] === 1;

			if ( info.isOrthographic ) {

				// See OrthographicCamera.updateProjectionMatrix and Matrix4.makeOrthographic:
				// the view width and height are used to populate matrix elements 0 and 5.
				const w = 2 / projection[ 0 ];
				const h = 2 / projection[ 5 ];
				info.pixelSize = Math.max( h / resolution.height, w / resolution.width );

			} else {

				// See PerspectiveCamera.updateProjectionMatrix and Matrix4.makePerspective:
				// the vertical FOV is used to populate matrix element 5.
				info.sseDenominator = ( 2 / projection[ 5 ] ) / resolution.height;

			}

			// get frustum in group root frame
			tempMat.copy( group.matrixWorld );
			tempMat.premultiply( camera.matrixWorldInverse );
			tempMat.premultiply( camera.projectionMatrix );

			frustum.setFromProjectionMatrix( tempMat );

			// get transform position in group root frame
			position.set( 0, 0, 0 );
			position.applyMatrix4( camera.matrixWorld );
			position.applyMatrix4( tempMat2 );

		}

		super.update();

		this.dispatchEvent( { type: 'update-after' } );

	}

	preprocessNode( tile, tileSetDir, parentTile = null ) {

		super.preprocessNode( tile, tileSetDir, parentTile );

		const transform = new Matrix4();
		if ( tile.transform ) {

			const transformArr = tile.transform;
			for ( let i = 0; i < 16; i ++ ) {

				transform.elements[ i ] = transformArr[ i ];

			}

		}

		if ( parentTile ) {

			transform.premultiply( parentTile.cached.transform );

		}

		const transformInverse = new Matrix4().copy( transform ).invert();
		const boundingVolume = new TileBoundingVolume();
		if ( 'sphere' in tile.boundingVolume ) {

			boundingVolume.setSphereData( ...tile.boundingVolume.sphere, transform );

		}

		if ( 'box' in tile.boundingVolume ) {

			boundingVolume.setObbData( tile.boundingVolume.box, transform );

		}

		if ( 'region' in tile.boundingVolume ) {

			boundingVolume.setRegionData( this.ellipsoid, ...tile.boundingVolume.region );

		}

		tile.cached = {

			_loadIndex: 0,
			transform,
			transformInverse,

			active: false,

			boundingVolume,

			metadata: null,
			scene: null,
			geometry: null,
			materials: null,
			textures: null,

		};

	}

	async requestTileContents( ...args ) {

		await super.requestTileContents( ...args );
		this.dispatchEvent( { type: 'load-content' } );

	}

	async parseTile( buffer, tile, extension, uri ) {

		const cached = tile.cached;
		cached._loadIndex ++;

		const uriSplits = uri.split( /[\\/]/g );
		uriSplits.pop();
		const workingPath = uriSplits.join( '/' );
		const fetchOptions = this.fetchOptions;

		const manager = this.manager;
		const loadIndex = cached._loadIndex;
		let promise = null;

		const cachedTransform = cached.transform;
		const upRotationMatrix = this._upRotationMatrix;
		const fileType = ( readMagicBytes( buffer ) || extension ).toLowerCase();
		switch ( fileType ) {

			case 'b3dm': {

				const loader = new B3DMLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( upRotationMatrix );

				promise = loader.parse( buffer );
				break;

			}

			case 'pnts': {

				const loader = new PNTSLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				promise = loader.parse( buffer );
				break;

			}

			case 'i3dm': {

				const loader = new I3DMLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( upRotationMatrix );
				loader.ellipsoid.copy( this.ellipsoid );

				promise = loader.parse( buffer );
				break;

			}

			case 'cmpt': {

				const loader = new CMPTLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( upRotationMatrix );
				loader.ellipsoid.copy( this.ellipsoid );

				promise = loader
					.parse( buffer )
					.then( res => res.scene	);
				break;

			}

			// 3DTILES_content_gltf
			case 'gltf':
			case 'glb': {

				const loader = new GLTFExtensionLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				promise = loader.parse( buffer );
				break;

			}

			default:
				console.warn( `TilesRenderer: Content type "${ fileType }" not supported.` );
				promise = Promise.resolve( null );
				break;

		}

		// check if this is the beginning of a new set of tiles to load and dispatch and event
		const stats = this.stats;
		if ( this._loadingTiles === false && stats.parsing + stats.downloading > 0 ) {

			this.dispatchEvent( { type: 'tiles-load-start' } );
			this._loadingTiles = true;

		}

		// wait for the tile to load
		const result = await promise;

		// get the scene data
		let scene;
		let metadata;
		if ( result.isObject3D ) {

			scene = result;
			metadata = null;

		} else {

			scene = result.scene;
			metadata = result;

		}

		// wait for extra processing by plugins if needed
		await this.invokeAllPlugins( plugin => {

			return plugin.processTileModel && plugin.processTileModel( scene, tile );

		} );

		// exit early if a new request has already started
		if ( cached._loadIndex !== loadIndex ) {

			return;

		}

		// ensure the matrix is up to date in case the scene has a transform applied
		scene.updateMatrix();

		// apply the local up-axis correction rotation
		// GLTFLoader seems to never set a transformation on the root scene object so
		// any transformations applied to it can be assumed to be applied after load
		// (such as applying RTC_CENTER) meaning they should happen _after_ the z-up
		// rotation fix which is why "multiply" happens here.
		if ( fileType === 'glb' || fileType === 'gltf' ) {

			scene.matrix.multiply( upRotationMatrix );

		}

		scene.matrix.premultiply( cachedTransform );
		scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
		scene.traverse( c => {

			c[ INITIAL_FRUSTUM_CULLED ] = c.frustumCulled;

		} );
		updateFrustumCulled( scene, ! this.autoDisableRendererCulling );

		if ( REVISION_LESS_165 ) {

			// We handle raycasting in a custom way so remove it from here
			scene.traverse( c => {

				c.raycast = this._overridenRaycast;

			} );

		}

		const materials = [];
		const geometry = [];
		const textures = [];
		scene.traverse( c => {

			if ( c.geometry ) {

				geometry.push( c.geometry );

			}

			if ( c.material ) {

				const material = c.material;
				materials.push( c.material );

				for ( const key in material ) {

					const value = material[ key ];
					if ( value && value.isTexture ) {

						textures.push( value );

					}

				}

			}

		} );

		cached.materials = materials;
		cached.geometry = geometry;
		cached.textures = textures;
		cached.scene = scene;
		cached.metadata = metadata;
		cached.bytesUsed = estimateBytesUsed( scene );

		// dispatch an event indicating that this model has completed
		this.dispatchEvent( {
			type: 'load-model',
			scene,
			tile,
		} );

		// dispatch an "end" event if all tiles have finished loading
		if ( this._loadingTiles === true && stats.parsing + stats.downloading === 1 ) {

			this.dispatchEvent( { type: 'tiles-load-end' } );
			this._loadingTiles = false;

		}

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		// This could get called before the tile has finished downloading
		const cached = tile.cached;
		if ( cached.scene ) {

			const materials = cached.materials;
			const geometry = cached.geometry;
			const textures = cached.textures;
			const parent = cached.scene.parent;

			// dispose of any textures required by the mesh features extension
			cached.scene.traverse( child => {

				if ( child.userData.meshFeatures ) {

					child.userData.meshFeatures.dispose();

				}

				if ( child.userData.structuralMetadata ) {

					child.userData.structuralMetadata.dispose();

				}

			} );

			for ( let i = 0, l = geometry.length; i < l; i ++ ) {

				geometry[ i ].dispose();

			}

			for ( let i = 0, l = materials.length; i < l; i ++ ) {

				materials[ i ].dispose();

			}

			for ( let i = 0, l = textures.length; i < l; i ++ ) {

				const texture = textures[ i ];

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

				texture.dispose();

			}

			if ( parent ) {

				parent.remove( cached.scene );

			}

			this.dispatchEvent( {
				type: 'dispose-model',
				scene: cached.scene,
				tile,
			} );

			cached.scene = null;
			cached.materials = null;
			cached.textures = null;
			cached.geometry = null;
			cached.metadata = null;

		}

		cached._loadIndex ++;

	}

	setTileVisible( tile, visible ) {

		const scene = tile.cached.scene;
		const visibleTiles = this.visibleTiles;
		const group = this.group;
		if ( visible ) {

			group.add( scene );
			visibleTiles.add( tile );
			scene.updateMatrixWorld( true );

		} else {

			group.remove( scene );
			visibleTiles.delete( tile );

		}

		this.dispatchEvent( {
			type: 'tile-visibility-change',
			scene,
			tile,
			visible,
		} );

	}

	setTileActive( tile, active ) {

		const activeTiles = this.activeTiles;
		if ( active ) {

			activeTiles.add( tile );

		} else {

			activeTiles.delete( tile );

		}

	}

	calculateError( tile ) {

		const cached = tile.cached;
		const cameras = this.cameras;
		const cameraInfo = this.cameraInfo;
		const boundingVolume = cached.boundingVolume;

		let maxError = - Infinity;
		let minDistance = Infinity;

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			// transform camera position into local frame of the tile bounding box
			const info = cameraInfo[ i ];
			let error;
			if ( info.isOrthographic ) {

				const pixelSize = info.pixelSize;
				error = tile.geometricError / pixelSize;

			} else {

				const distance = boundingVolume.distanceToPoint( info.position );
				const sseDenominator = info.sseDenominator;
				error = tile.geometricError / ( distance * sseDenominator );

				minDistance = Math.min( minDistance, distance );

			}

			maxError = Math.max( maxError, error );

		}

		tile.__distanceFromCamera = minDistance;
		tile.__error = maxError;

	}

	tileInView( tile ) {

		const cached = tile.cached;
		const boundingVolume = cached.boundingVolume;
		const cameraInfo = this.cameraInfo;
		for ( let i = 0, l = cameraInfo.length; i < l; i ++ ) {

			// Track which camera frustums this tile is in so we can use it
			// to ignore the error calculations for cameras that can't see it
			const frustum = cameraInfo[ i ].frustum;
			if ( boundingVolume.intersectsFrustum( frustum ) ) {

				return true;

			}

		}

		return false;

	}

	// TODO: deprecate this function and provide a plugin to help with this
	// adjust the rotation of the group such that Y is altitude, X is North, and Z is East
	setLatLonToYUp( lat, lon ) {

		const { ellipsoid, group } = this;

		_euler.set( Math.PI / 2, Math.PI / 2, 0 );
		_mat.makeRotationFromEuler( _euler );

		ellipsoid.getEastNorthUpFrame( lat, lon, group.matrix )
			.multiply( _mat )
			.invert()
			.decompose(
				group.position,
				group.quaternion,
				group.scale,
			);

		group.updateMatrixWorld( true );

	}

}


[
	[ 'onLoadTileSet', 'load-tile-set' ],
	[ 'onLoadModel', 'load-model' ],
	[ 'onDisposeModel', 'dispose-model' ],
	[ 'onTileVisibilityChange', 'tile-visibility-change' ],
].forEach( ( [ methodName, eventName ] ) => {

	const cachedName = Symbol( methodName );
	Object.defineProperty(
		TilesRenderer.prototype,
		methodName,
		{
			get() {

				return this[ cachedName ] || null;

			},

			set( cb ) {

				console.warn( `TilesRenderer: "${ methodName }" has been deprecated in favor of the "${ eventName }" event.` );

				if ( this[ cachedName ] ) {

					this.removeEventListener( eventName, this[ cachedName ] );

				}

				this[ cachedName ] = cb;
				this.addEventListener( eventName, cb );

			}
		}
	);

} );
