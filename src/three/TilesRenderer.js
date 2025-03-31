import { TilesRendererBase } from '../base/TilesRendererBase.js';
import { B3DMLoader } from './loaders/B3DMLoader.js';
import { PNTSLoader } from './loaders/PNTSLoader.js';
import { I3DMLoader } from './loaders/I3DMLoader.js';
import { CMPTLoader } from './loaders/CMPTLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Vector3,
	Vector2,
	Euler,
	LoadingManager,
	EventDispatcher,
	Group,
} from 'three';
import { raycastTraverse, raycastTraverseFirstHit } from './raycastTraverse.js';
import { readMagicBytes } from '../utilities/readMagicBytes.js';
import { TileBoundingVolume } from './math/TileBoundingVolume.js';
import { ExtendedFrustum } from './math/ExtendedFrustum.js';
import { estimateBytesUsed } from './utilities.js';
import { WGS84_ELLIPSOID } from './math/GeoConstants.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const _mat = new Matrix4();
const _euler = new Euler();

// In three.js r165 and higher raycast traversal can be ended early
const INITIAL_FRUSTUM_CULLED = Symbol( 'INITIAL_FRUSTUM_CULLED' );
const tempMat = new Matrix4();
const tempVector = new Vector3();
const tempVector2 = new Vector2();
const viewErrorTarget = {
	inView: false,
	error: Infinity,
};

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

	get optimizeRaycast() {

		return this._optimizeRaycast;

	}

	set optimizeRaycast( v ) {

		console.warn( 'TilesRenderer: The "optimizeRaycast" option has been deprecated.' );
		this._optimizeRaycast = v;

	}

	constructor( ...args ) {

		super( ...args );
		this.group = new TilesGroup( this );
		this.ellipsoid = WGS84_ELLIPSOID.clone();
		this.cameras = [];
		this.cameraMap = new Map();
		this.cameraInfo = [];
		this._optimizeRaycast = true;
		this._upRotationMatrix = new Matrix4();

		this.lruCache.computeMemoryUsageCallback = tile => tile.cached.bytesUsed ?? null;

		// flag indicating whether frustum culling should be disabled
		this._autoDisableRendererCulling = true;

		const manager = new LoadingManager();
		manager.setURLModifier( url => {

			if ( this.preprocessURL ) {

				return this.preprocessURL( url );

			} else {

				return url;

			}

		} );
		this.manager = manager;

		// saved for event dispatcher functions
		this._listeners = {};

	}

	addEventListener( ...args ) {

		EventDispatcher.prototype.addEventListener.call( this, ...args );

	}

	hasEventListener( ...args ) {

		EventDispatcher.prototype.hasEventListener.call( this, ...args );

	}

	removeEventListener( ...args ) {

		EventDispatcher.prototype.removeEventListener.call( this, ...args );

	}

	dispatchEvent( ...args ) {

		EventDispatcher.prototype.dispatchEvent.call( this, ...args );

	}

	/* Public API */
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

			const scene = tile.cached && tile.cached.scene;
			if ( scene ) {

				callback( scene, tile );

			}

		}, null, false );

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
	loadRootTileSet( ...args ) {

		return super.loadRootTileSet( ...args )
			.then( root => {

				// cache the gltf tile set rotation matrix
				const { asset, extensions = {} } = root;
				const upAxis = asset && asset.gltfUpAxis || 'y';
				switch ( upAxis.toLowerCase() ) {

					case 'x':
						this._upRotationMatrix.makeRotationAxis( Y_AXIS, - Math.PI / 2 );
						break;

					case 'y':
						this._upRotationMatrix.makeRotationAxis( X_AXIS, Math.PI / 2 );
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

	update() {

		// check if the plugins that can block the tile updates require it
		let needsUpdate = null;
		this.invokeAllPlugins( plugin => {

			if ( plugin.doTilesNeedUpdate ) {

				const res = plugin.doTilesNeedUpdate();
				if ( needsUpdate === null ) {

					needsUpdate = res;

				} else {

					needsUpdate = Boolean( needsUpdate || res );

				}

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

			let found = false;
			this.invokeAllPlugins( plugin => found = found || Boolean( plugin !== this && plugin.calculateTileViewError ) );
			if ( found === false ) {

				console.warn( 'TilesRenderer: no cameras defined. Cannot update 3d tiles.' );
				return;

			}

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
		tempVector.setFromMatrixScale( group.matrixWorldInverse );
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
			position.applyMatrix4( group.matrixWorldInverse );

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

	async parseTile( buffer, tile, extension, uri, abortSignal ) {

		const cached = tile.cached;
		const uriSplits = uri.split( /[\\/]/g );
		uriSplits.pop();
		const workingPath = uriSplits.join( '/' );
		const fetchOptions = this.fetchOptions;

		const manager = this.manager;
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

				const loader = manager.getHandler( 'path.gltf' ) || manager.getHandler( 'path.glb' ) || new GLTFLoader( manager );
				loader.setWithCredentials( fetchOptions.credentials === 'include' );
				loader.setRequestHeader( fetchOptions.headers || {} );
				if ( fetchOptions.credentials === 'include' && fetchOptions.mode === 'cors' ) {

					loader.setCrossOrigin( 'use-credentials' );

				}

				// assume any pre-registered loader has paths configured as the user desires, but if we're making
				// a new loader, use the working path during parse to support relative uris on other hosts
				let resourcePath = loader.resourcePath || loader.path || workingPath;
				if ( ! /[\\/]$/.test( resourcePath ) && resourcePath.length ) {

					resourcePath += '/';

				}

				promise = loader.parseAsync( buffer, resourcePath ).then( result => {

					// glTF files are not guaranteed to include a scene object
					result.scene = result.scene || new Group();

					// apply the local up-axis correction rotation
					// GLTFLoader seems to never set a transformation on the root scene object so
					// any transformations applied to it can be assumed to be applied after load
					// (such as applying RTC_CENTER) meaning they should happen _after_ the z-up
					// rotation fix which is why "multiply" happens here.
					const { scene } = result;
					scene.updateMatrix();
					scene.matrix
						.multiply( upRotationMatrix )
						.decompose( scene.position, scene.quaternion, scene.scale );

					return result;

				} );
				break;

			}

			default: {

				promise = this.invokeOnePlugin( plugin => plugin.parseToMesh && plugin.parseToMesh( buffer, tile, extension, uri, abortSignal ) );
				break;

			}

		}

		// wait for the tile to load
		const result = await promise;
		if ( result === null ) {

			throw new Error( `TilesRenderer: Content type "${ fileType }" not supported.` );

		}

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

		// ensure the matrix is up to date in case the scene has a transform applied
		scene.updateMatrix();
		scene.matrix.premultiply( cachedTransform );
		scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
		scene.traverse( c => {

			c[ INITIAL_FRUSTUM_CULLED ] = c.frustumCulled;

		} );
		updateFrustumCulled( scene, ! this.autoDisableRendererCulling );

		// collect all original geometries, materials, etc to be disposed of later
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

		// exit early if a new request has already started
		if ( abortSignal.aborted ) {

			// dispose of any image bitmaps that have been opened.
			// TODO: share this code with the "disposeTile" code below, possibly allow for the tiles
			// renderer base to trigger a disposal of unneeded data
			for ( let i = 0, l = textures.length; i < l; i ++ ) {

				const texture = textures[ i ];

				if ( texture.image instanceof ImageBitmap ) {

					texture.image.close();

				}

				texture.dispose();

			}

			return;

		}

		cached.materials = materials;
		cached.geometry = geometry;
		cached.textures = textures;
		cached.scene = scene;
		cached.metadata = metadata;
		cached.bytesUsed = estimateBytesUsed( scene );

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
			// TODO: these are being discarded here to remove the image bitmaps -
			// can this be handled in another way? Or more generically?
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

	}

	setTileVisible( tile, visible ) {

		const scene = tile.cached.scene;
		const group = this.group;

		if ( visible ) {

			if ( scene ) {

				group.add( scene );
				scene.updateMatrixWorld( true );

			}

		} else {

			if ( scene ) {

				group.remove( scene );

			}

		}

		super.setTileVisible( tile, visible );

		this.dispatchEvent( {
			type: 'tile-visibility-change',
			scene,
			tile,
			visible,
		} );

	}

	calculateTileViewError( tile, target ) {

		const cached = tile.cached;
		const cameras = this.cameras;
		const cameraInfo = this.cameraInfo;
		const boundingVolume = cached.boundingVolume;

		let inView = false;
		let inViewError = - Infinity;
		let inViewDistance = Infinity;
		let maxError = - Infinity;
		let minDistance = Infinity;

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			// calculate the camera error
			const info = cameraInfo[ i ];
			let error;
			let distance;
			if ( info.isOrthographic ) {

				const pixelSize = info.pixelSize;
				error = tile.geometricError / pixelSize;
				distance = Infinity;

			} else {

				const sseDenominator = info.sseDenominator;
				distance = boundingVolume.distanceToPoint( info.position );
				error = tile.geometricError / ( distance * sseDenominator );

			}

			// Track which camera frustums this tile is in so we can use it
			// to ignore the error calculations for cameras that can't see it
			const frustum = cameraInfo[ i ].frustum;
			if ( boundingVolume.intersectsFrustum( frustum ) ) {

				inView = true;
				inViewError = Math.max( inViewError, error );
				inViewDistance = Math.min( inViewDistance, distance );

			}

			maxError = Math.max( maxError, error );
			minDistance = Math.min( minDistance, distance );

		}

		// check the plugin visibility
		this.invokeAllPlugins( plugin => {

			if ( plugin !== this && plugin.calculateTileViewError ) {

				plugin.calculateTileViewError( tile, viewErrorTarget );
				if ( viewErrorTarget.inView ) {

					inView = true;
					inViewError = Math.max( inViewError, viewErrorTarget.error );

				}

				maxError = Math.max( maxError, viewErrorTarget.error );

			}

		} );

		// If the tiles are out of view then use the global distance and error calculated
		if ( inView ) {

			target.inView = true;
			target.error = inViewError;
			target.distanceToCamera = inViewDistance;

		} else {

			target.inView = false;
			target.error = maxError;
			target.distanceToCamera = minDistance;

		}

	}

	// TODO: deprecate this function and provide a plugin to help with this
	// adjust the rotation of the group such that Y is altitude, X is North, and Z is East
	setLatLonToYUp( lat, lon ) {

		console.warn( 'TilesRenderer: setLatLonToYUp is deprecated. Use the ReorientationPlugin, instead.' );

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

	dispose() {

		super.dispose();
		this.group.removeFromParent();

	}

}
