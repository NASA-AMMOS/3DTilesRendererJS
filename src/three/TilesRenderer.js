import { TilesRendererBase } from '../base/TilesRendererBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { PNTSLoader } from './PNTSLoader.js';
import { I3DMLoader } from './I3DMLoader.js';
import { CMPTLoader } from './CMPTLoader.js';
import { GLTFExtensionLoader } from './GLTFExtensionLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Vector3,
	Vector2,
	LoadingManager,
	EventDispatcher,
	REVISION,
} from 'three';
import { raycastTraverse, raycastTraverseFirstHit } from './raycastTraverse.js';
import { readMagicBytes } from '../utilities/readMagicBytes.js';
import { TileBoundingVolume } from './math/TileBoundingVolume.js';
import { ExtendedFrustum } from './math/ExtendedFrustum.js';

// In three.js r165 and higher raycast traversal can be ended early
const REVISION_165 = parseInt( REVISION ) < 165;
const INITIAL_FRUSTUM_CULLED = Symbol( 'INITIAL_FRUSTUM_CULLED' );
const tempMat = new Matrix4();
const tempMat2 = new Matrix4();
const tempVector = new Vector3();

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
		this.cameras = [];
		this.cameraMap = new Map();
		this.cameraInfo = [];
		this.activeTiles = new Set();
		this.visibleTiles = new Set();
		this.optimizeRaycast = true;
		this._autoDisableRendererCulling = true;
		this._eventDispatcher = new EventDispatcher();

		this.onLoadTileSet = null;
		this.onLoadModel = null;
		this.onDisposeModel = null;
		this.onTileVisibilityChange = null;

		const manager = new LoadingManager();
		manager.setURLModifier( url => {

			if ( this.preprocessURL ) {

				return this.preprocessURL( url );

			} else {

				return url;

			}

		} );
		this.manager = manager;

		if ( REVISION_165 ) {

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

			return true;

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

			return true;

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
			return true;

		}
		return false;

	}

	setResolution( camera, xOrVec, y ) {

		const cameraMap = this.cameraMap;
		if ( ! cameraMap.has( camera ) ) {

			return false;

		}

		if ( xOrVec instanceof Vector2 ) {

			cameraMap.get( camera ).copy( xOrVec );

		} else {

			cameraMap.get( camera ).set( xOrVec, y );

		}
		return true;

	}

	setResolutionFromRenderer( camera, renderer ) {

		const cameraMap = this.cameraMap;
		if ( ! cameraMap.has( camera ) ) {

			return false;

		}

		const resolution = cameraMap.get( camera );
		renderer.getSize( resolution );
		resolution.multiplyScalar( renderer.getPixelRatio() );
		return true;

	}

	deleteCamera( camera ) {

		const cameras = this.cameras;
		const cameraMap = this.cameraMap;
		if ( cameraMap.has( camera ) ) {

			const index = cameras.indexOf( camera );
			cameras.splice( index, 1 );
			cameraMap.delete( camera );
			return true;

		}
		return false;

	}

	/* Overriden */
	fetchTileSet( url, ...rest ) {

		const pr = super.fetchTileSet( url, ...rest );
		pr.then( json => {

			// Push this onto the end of the event stack to ensure this runs
			// after the base renderer has placed the provided json where it
			// needs to be placed and is ready for an update.
			queueMicrotask( () => {

				this.dispatchEvent( {
					type: 'load-tile-set',
					tileSet: json,
					url,
				} );

				if ( this.onLoadTileSet ) {

					this.onLoadTileSet( json, url );

				}

			} );


		} ).catch( () => {

			// error is logged internally

		} );
		return pr;

	}

	update() {

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
		const invScale = tempVector.x;

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

			info.invScale = invScale;

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

			boundingVolume.setRegionData( ...tile.boundingVolume.region );

		}

		tile.cached = {

			loadIndex: 0,
			transform,
			transformInverse,

			active: false,
			inFrustum: [],

			boundingVolume,

			scene: null,
			geometry: null,
			materials: null,
			textures: null,

		};

	}

	parseTile( buffer, tile, extension ) {

		tile._loadIndex = tile._loadIndex || 0;
		tile._loadIndex ++;

		const uri = tile.content.uri;
		const uriSplits = uri.split( /[\\\/]/g );
		uriSplits.pop();
		const workingPath = uriSplits.join( '/' );
		const fetchOptions = this.fetchOptions;

		const manager = this.manager;
		const loadIndex = tile._loadIndex;
		let promise = null;

		const upAxis = this.rootTileSet.asset && this.rootTileSet.asset.gltfUpAxis || 'y';
		const cached = tile.cached;
		const cachedTransform = cached.transform;

		const upAdjustment = new Matrix4();
		switch ( upAxis.toLowerCase() ) {

			case 'x':
				upAdjustment.makeRotationAxis( Y_AXIS, - Math.PI / 2 );
				break;

			case 'y':
				upAdjustment.makeRotationAxis( X_AXIS, Math.PI / 2 );
				break;

		}

		const fileType = ( readMagicBytes( buffer ) || extension ).toLowerCase();
		switch ( fileType ) {

			case 'b3dm': {

				const loader = new B3DMLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( upAdjustment );

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

				loader.adjustmentTransform.copy( upAdjustment );

				promise = loader.parse( buffer );
				break;

			}

			case 'cmpt': {

				const loader = new CMPTLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( upAdjustment );

				promise = loader
					.parse( buffer )
					.then( res => res.scene	);
				break;

			}

			// 3DTILES_content_gltf
			case 'gltf':
			case 'glb':
				const loader = new GLTFExtensionLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				promise = loader.parse( buffer );
				break;

			default:
				console.warn( `TilesRenderer: Content type "${ fileType }" not supported.` );
				promise = Promise.resolve( null );
				break;

		}

		return promise.then( result => {

			let scene;
			let metadata;
			if ( result.isObject3D ) {

				scene = result;
				metadata = null;

			} else {

				scene = result.scene;
				metadata = result;

			}

			if ( tile._loadIndex !== loadIndex ) {

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

				scene.matrix.multiply( upAdjustment );

			}

			scene.matrix.premultiply( cachedTransform );
			scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
			scene.traverse( c => {

				c[ INITIAL_FRUSTUM_CULLED ] = c.frustumCulled;

			} );
			updateFrustumCulled( scene, ! this.autoDisableRendererCulling );

			if ( REVISION_165 ) {

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

			this.dispatchEvent( {
				type: 'load-model',
				scene,
				tile,
			} );

			if ( this.onLoadModel ) {

				this.onLoadModel( scene, tile );

			}

		} );

	}

	disposeTile( tile ) {

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

			if ( this.onDisposeModel ) {

				this.onDisposeModel( cached.scene, tile );

			}

			cached.scene = null;
			cached.materials = null;
			cached.textures = null;
			cached.geometry = null;
			cached.metadata = null;

		}

		this.activeTiles.delete( tile );
		this.visibleTiles.delete( tile );
		tile._loadIndex ++;

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

		if ( this.onTileVisibilityChange ) {

			this.onTileVisibilityChange( scene, tile, visible );

		}

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
		const inFrustum = cached.inFrustum;
		const cameras = this.cameras;
		const cameraInfo = this.cameraInfo;
		const boundingVolume = cached.boundingVolume;

		let maxError = - Infinity;
		let minDistance = Infinity;

		for ( let i = 0, l = cameras.length; i < l; i ++ ) {

			if ( ! inFrustum[ i ] ) {

				continue;

			}

			// transform camera position into local frame of the tile bounding box
			const info = cameraInfo[ i ];
			const invScale = info.invScale;

			let error;
			if ( info.isOrthographic ) {

				const pixelSize = info.pixelSize;
				error = tile.geometricError / ( pixelSize * invScale );

			} else {

				const distance = boundingVolume.distanceToPoint( info.position );
				const scaledDistance = distance * invScale;
				const sseDenominator = info.sseDenominator;
				error = tile.geometricError / ( scaledDistance * sseDenominator );

				minDistance = Math.min( minDistance, scaledDistance );

			}

			maxError = Math.max( maxError, error );

		}

		tile.__distanceFromCamera = minDistance;
		tile.__error = maxError;

	}

	tileInView( tile ) {

		const cached = tile.cached;
		const boundingVolume = cached.boundingVolume;
		const inFrustum = cached.inFrustum;
		const cameraInfo = this.cameraInfo;
		let inView = false;
		for ( let i = 0, l = cameraInfo.length; i < l; i ++ ) {

			// Track which camera frustums this tile is in so we can use it
			// to ignore the error calculations for cameras that can't see it
			const frustum = cameraInfo[ i ].frustum;
			if ( boundingVolume.intersectsFrustum( frustum ) ) {

				inView = true;
				inFrustum[ i ] = true;

			} else {

				inFrustum[ i ] = false;

			}

		}

		return inView;

	}

}
