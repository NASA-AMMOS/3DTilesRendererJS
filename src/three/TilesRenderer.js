import { TilesRendererBase } from '../base/TilesRendererBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { PNTSLoader } from './PNTSLoader.js';
import { I3DMLoader } from './I3DMLoader.js';
import { CMPTLoader } from './CMPTLoader.js';
import { GLTFExtensionLoader } from './GLTFExtensionLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Box3,
	Sphere,
	Vector3,
	Vector2,
	Frustum,
	LoadingManager
} from 'three';
import { raycastTraverse, raycastTraverseFirstHit } from './raycastTraverse.js';

const INITIAL_FRUSTUM_CULLED = Symbol( 'INITIAL_FRUSTUM_CULLED' );
const tempMat = new Matrix4();
const tempMat2 = new Matrix4();
const tempVector = new Vector3();
const vecX = new Vector3();
const vecY = new Vector3();
const vecZ = new Vector3();

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
		this._autoDisableRendererCulling = true;
		this.optimizeRaycast = true;

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

		// Setting up the override raycasting function to be used by
		// 3D objects created by this renderer
		const tilesRenderer = this;
		this._overridenRaycast = function ( raycaster, intersects ) {

			if ( ! tilesRenderer.optimizeRaycast ) {

				Object.getPrototypeOf( this ).raycast.call( this, raycaster, intersects );

			}

		};

	}

	/* Public API */
	getBounds( box ) {

		if ( ! this.root ) {

			return false;

		}

		const cached = this.root.cached;
		const boundingBox = cached.box;
		const obbMat = cached.boxTransform;

		if ( boundingBox ) {

			box.copy( boundingBox );
			box.applyMatrix4( obbMat );

			return true;

		} else {

			return false;

		}

	}

	getOrientedBounds( box, matrix ) {

		if ( ! this.root ) {

			return false;

		}

		const cached = this.root.cached;
		const boundingBox = cached.box;
		const obbMat = cached.boxTransform;

		if ( boundingBox ) {

			box.copy( boundingBox );
			matrix.copy( obbMat );

			return true;

		} else {

			return false;

		}

	}

	getBoundingSphere( sphere ) {

		if ( ! this.root ) {

			return false;

		}

		const boundingSphere = this.root.cached.sphere;

		if ( boundingSphere ) {

			sphere.copy( boundingSphere );
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

			const hit = raycastTraverseFirstHit( this.root, this.group, this.activeTiles, raycaster );
			if ( hit ) {

				intersects.push( hit );

			}

		} else {

			raycastTraverse( this.root, this.group, this.activeTiles, raycaster, intersects );

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

			if ( this.onLoadTileSet ) {

				// Push this onto the end of the event stack to ensure this runs
				// after the base renderer has placed the provided json where it
				// needs to be placed and is ready for an update.
				Promise.resolve().then( () => {

					this.onLoadTileSet( json, url );

				} );

			}

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

				frustum: new Frustum(),
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

	preprocessNode( tile, parentTile, tileSetDir ) {

		super.preprocessNode( tile, parentTile, tileSetDir );

		const transform = new Matrix4();
		if ( tile.transform ) {

			const transformArr = tile.transform;
			for ( let i = 0; i < 16; i ++ ) {

				transform.elements[ i ] = transformArr[ i ];

			}

		} else {

			transform.identity();

		}

		if ( parentTile ) {

			transform.premultiply( parentTile.cached.transform );

		}

		const transformInverse = new Matrix4().copy( transform ).invert();

		let box = null;
		let boxTransform = null;
		let boxTransformInverse = null;
		if ( 'box' in tile.boundingVolume ) {

			const data = tile.boundingVolume.box;
			box = new Box3();
			boxTransform = new Matrix4();
			boxTransformInverse = new Matrix4();

			// get the extents of the bounds in each axis
			vecX.set( data[ 3 ], data[ 4 ], data[ 5 ] );
			vecY.set( data[ 6 ], data[ 7 ], data[ 8 ] );
			vecZ.set( data[ 9 ], data[ 10 ], data[ 11 ] );

			const scaleX = vecX.length();
			const scaleY = vecY.length();
			const scaleZ = vecZ.length();

			vecX.normalize();
			vecY.normalize();
			vecZ.normalize();

			// handle the case where the box has a dimension of 0 in one axis
			if ( scaleX === 0 ) {

				vecX.crossVectors( vecY, vecZ );

			}

			if ( scaleY === 0 ) {

				vecY.crossVectors( vecX, vecZ );

			}

			if ( scaleZ === 0 ) {

				vecZ.crossVectors( vecX, vecY );

			}

			// create the oriented frame that the box exists in
			boxTransform.set(
				vecX.x, vecY.x, vecZ.x, data[ 0 ],
				vecX.y, vecY.y, vecZ.y, data[ 1 ],
				vecX.z, vecY.z, vecZ.z, data[ 2 ],
				0, 0, 0, 1
			);
			boxTransform.premultiply( transform );
			boxTransformInverse.copy( boxTransform ).invert();

			// scale the box by the extents
			box.min.set( - scaleX, - scaleY, - scaleZ );
			box.max.set( scaleX, scaleY, scaleZ );

		}

		let sphere = null;
		if ( 'sphere' in tile.boundingVolume ) {

			const data = tile.boundingVolume.sphere;
			sphere = new Sphere();
			sphere.center.set( data[ 0 ], data[ 1 ], data[ 2 ] );
			sphere.radius = data[ 3 ];
			sphere.applyMatrix4( transform );

		} else if ( 'box' in tile.boundingVolume ) {

			const data = tile.boundingVolume.box;
			sphere = new Sphere();
			box.getBoundingSphere( sphere );
			sphere.center.set( data[ 0 ], data[ 1 ], data[ 2 ] );
			sphere.applyMatrix4( transform );

		}

		const region = null;
		if ( 'region' in tile.boundingVolume ) {

			console.warn( 'ThreeTilesRenderer: region bounding volume not supported.' );

		}

		tile.cached = {

			loadIndex: 0,
			transform,
			transformInverse,

			active: false,
			inFrustum: [],

			box,
			boxTransform,
			boxTransformInverse,
			sphere,
			region,

			scene: null,
			geometry: null,
			material: null,

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

		switch ( upAxis.toLowerCase() ) {

			case 'x':
				tempMat.makeRotationAxis( Y_AXIS, - Math.PI / 2 );
				break;

			case 'y':
				tempMat.makeRotationAxis( X_AXIS, Math.PI / 2 );
				break;

			case 'z':
				tempMat.identity();
				break;

		}

		switch ( extension ) {

			case 'b3dm': {

				const loader = new B3DMLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( tempMat );

				promise = loader
					.parse( buffer )
					.then( res => res.scene );
				break;

			}

			case 'pnts': {

				const loader = new PNTSLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				promise = loader
					.parse( buffer )
					.then( res => res.scene );
				break;

			}

			case 'i3dm': {

				const loader = new I3DMLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( tempMat );

				promise = loader
					.parse( buffer )
					.then( res => res.scene );
				break;

			}

			case 'cmpt': {

				const loader = new CMPTLoader( manager );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;

				loader.adjustmentTransform.copy( tempMat );

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
				promise = loader
					.parse( buffer )
					.then( res => res.scene	);
				break;

			default:
				console.warn( `TilesRenderer: Content type "${ extension }" not supported.` );
				promise = Promise.resolve( null );
				break;

		}

		return promise.then( scene => {

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
			if ( extension === 'glb' || extension === 'gltf' ) {

				scene.matrix.multiply( tempMat );

			}

			scene.matrix.premultiply( cachedTransform );
			scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
			scene.traverse( c => {

				c[ INITIAL_FRUSTUM_CULLED ] = c.frustumCulled;

			} );
			updateFrustumCulled( scene, ! this.autoDisableRendererCulling );

			cached.scene = scene;

			// We handle raycasting in a custom way so remove it from here
			scene.traverse( c => {

				c.raycast = this._overridenRaycast;

			} );

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

			for ( let i = 0, l = geometry.length; i < l; i ++ ) {

				geometry[ i ].dispose();

			}

			for ( let i = 0, l = materials.length; i < l; i ++ ) {

				materials[ i ].dispose();

			}

			for ( let i = 0, l = textures.length; i < l; i ++ ) {

				const texture = textures[ i ];
				texture.dispose();

			}

			if ( parent ) {

				parent.remove( cached.scene );

			}

			if ( this.onDisposeModel ) {

				this.onDisposeModel( cached.scene, tile );

			}

			cached.scene = null;
			cached.materials = null;
			cached.textures = null;
			cached.geometry = null;

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

		// TODO: Use the content bounding volume here?
		// TODO: We should use the largest distance to the tile between
		// all available bounding volume types.
		const boundingVolume = tile.boundingVolume;

		if ( 'box' in boundingVolume || 'sphere' in boundingVolume ) {

			const boundingSphere = cached.sphere;
			const boundingBox = cached.box;
			const boxTransformInverse = cached.boxTransformInverse;
			const transformInverse = cached.transformInverse;
			const useBox = boundingBox && boxTransformInverse;

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

					tempVector.copy( info.position );

					let distance;
					if ( useBox ) {

						tempVector.applyMatrix4( boxTransformInverse );
						distance = boundingBox.distanceToPoint( tempVector );

					} else {

						tempVector.applyMatrix4( transformInverse );
						// Sphere#distanceToPoint is negative inside the sphere, whereas Box3#distanceToPoint is
						// zero inside the box. Clipping the distance to a minimum of zero ensures that both
						// types of bounding volume behave the same way.
						distance = Math.max( boundingSphere.distanceToPoint( tempVector ), 0 );

					}

					const scaledDistance = distance * invScale;
					const sseDenominator = info.sseDenominator;
					error = tile.geometricError / ( scaledDistance * sseDenominator );

					minDistance = Math.min( minDistance, scaledDistance );

				}

				maxError = Math.max( maxError, error );

			}

			tile.__distanceFromCamera = minDistance;
			tile.__error = maxError;

		} else if ( 'region' in boundingVolume ) {

			// unsupported
			console.warn( 'ThreeTilesRenderer : Region bounds not supported.' );

		}

	}

	tileInView( tile ) {

		// TODO: we should use the more precise bounding volumes here if possible
		// cache the root-space planes
		// Use separating axis theorem for frustum and obb

		const cached = tile.cached;
		const sphere = cached.sphere;
		const inFrustum = cached.inFrustum;
		if ( sphere ) {

			const cameraInfo = this.cameraInfo;
			let inView = false;
			for ( let i = 0, l = cameraInfo.length; i < l; i ++ ) {

				// Track which camera frustums this tile is in so we can use it
				// to ignore the error calculations for cameras that can't see it
				const frustum = cameraInfo[ i ].frustum;
				if ( frustum.intersectsSphere( sphere ) ) {

					inView = true;
					inFrustum[ i ] = true;

				} else {

					inFrustum[ i ] = false;

				}

			}

			return inView;

		}

		return true;

	}

}
