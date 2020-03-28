import { TilesRendererBase } from '../base/TilesRendererBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Box3,
	Sphere,
	Vector3,
	Vector2,
	Math as MathUtils,
	Quaternion,
	Frustum,
	CanvasTexture,
	LoadingManager,
	ImageBitmapLoader,
} from 'three';
import { raycastTraverse, raycastTraverseFirstHit } from './raycastTraverse.js';

const DEG2RAD = MathUtils.DEG2RAD;
const tempMat = new Matrix4();
const tempQuaternion = new Quaternion();
const tempVector = new Vector3();
const vecX = new Vector3();
const vecY = new Vector3();
const vecZ = new Vector3();
const _sphere = new Sphere();

const X_AXIS = new Vector3( 1, 0, 0 );
const Y_AXIS = new Vector3( 0, 1, 0 );

function emptyRaycast() {}

export class TilesRenderer extends TilesRendererBase {

	get camera() {

		return this.cameras[ 0 ];

	}

	set camera( camera ) {

		const cameras = this.cameras;
		cameras.length = 1;
		cameras[ 0 ] = camera;

	}

	constructor( ...args ) {

		super( ...args );
		this.group = new TilesGroup( this );
		this.cameras = [];
		this.resolution = new Vector2();
		this.frustums = [];
		this.activeTiles = new Set();
		this.visibleTiles = new Set();

	}

	/* Public API */
	getBounds( box ) {

		if ( ! this.root ) {

			return false;

		}

		const cached = this.root.cached;
		const boundingBox = cached.box;
		const obbMat = cached.boxTransform;
		const transformMat = cached.transform;

		box.copy( boundingBox );
		tempMat.multiplyMatrices( transformMat, obbMat );
		box.applyMatrix4( tempMat );

		return true;

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

	setResolutionFromRenderer( renderer ) {

		const resolution = this.resolution;
		renderer.getSize( resolution );
		resolution.multiplyScalar( renderer.getPixelRatio() );

	}

	/* Overriden */
	update() {

		const group = this.group;
		const cameras = this.cameras;
		const frustums = this.frustums;
		const resolution = this.resolution;

		if ( cameras.length === 0 ) {

			console.warn( 'TilesRenderer: no cameras to use are defined. Cannot update 3d tiles.' );
			return;

		}

		if ( resolution.width === 0 || resolution.height === 0 ) {

			console.warn( 'TilesRenderer: resolution for error calculation is not set. Cannot updated 3d tiles.' );
			return;

		}

		// automatically scale the array of frustums to match the cameras
		while ( frustums.length > cameras.length ) {

			frustums.pop();

		}

		while ( frustums.length < cameras.length ) {

			frustums.push( new Frustum() );

		}

		// store the camera frustums in the 3d tiles root frame
		for ( let i = 0, l = frustums.length; i < l; i ++ ) {

			const camera = cameras[ i ];
			const frustum = frustums[ i ];

			tempMat.copy( group.matrixWorld );
			tempMat.premultiply( camera.matrixWorldInverse );
			tempMat.premultiply( camera.projectionMatrix );
			frustum.setFromProjectionMatrix( tempMat );

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

			transform.multiply( parentTile.cached.transform );

		}

		let box = null;
		let boxTransform = null;
		if ( 'box' in tile.boundingVolume ) {

			const data = tile.boundingVolume.box;
			box = new Box3();
			boxTransform = new Matrix4();

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

			// create the oriented frame that the box exists in
			boxTransform.set(
				vecX.x, vecY.x, vecZ.x, data[ 0 ],
				vecX.y, vecY.y, vecZ.y, data[ 1 ],
				vecX.z, vecY.z, vecZ.z, data[ 2 ],
				0, 0, 0, 1
			);

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

		} else if ( 'box' in tile.boundingVolume ) {

			sphere = new Sphere();
			box.getBoundingSphere( sphere );
			boxTransform.decompose( sphere.center, tempQuaternion, tempVector );

		}

		let region = null;
		if ( 'region' in tile.boundingVolume ) {

			console.warn( 'ThreeTilesRenderer: region bounding volume not supported.' );

		}

		tile.cached = {

			loadIndex: 0,
			transform,
			active: false,

			box,
			boxTransform,
			sphere,
			region,

			scene: null,
			geometry: null,
			material: null,
			distance: Infinity

		};

	}

	parseTile( buffer, tile ) {

		tile._loadIndex = tile._loadIndex || 0;
		tile._loadIndex ++;

		const loadIndex = tile._loadIndex;

		const manager = new LoadingManager();

		if ( typeof createImageBitmap !== 'undefined' ) {

			manager.addHandler(/(^blob:)|(\.png$)|(\.jpg$)|(\.jpeg$)/g, {

				load( url, onComplete ) {

					const loader = new ImageBitmapLoader();
					loader.load( url, res => {

						onComplete( new CanvasTexture( res ) );

					} );

				}

			});

		}

		return new B3DMLoader( manager ).parse( buffer ).then( res => {

			if ( tile._loadIndex !== loadIndex ) {

				return;

			}

			const upAxis = this.rootTileSet.asset && this.rootTileSet.asset.gltfUpAxis || 'y';
			const cached = tile.cached;
			const cachedTransform = cached.transform;

			const scene = res.scene;
			switch ( upAxis.toLowerCase() ) {

				case 'x':
					scene.matrix.makeRotationAxis( Y_AXIS, - Math.PI / 2 );
					break;

				case 'y':
					scene.matrix.makeRotationAxis( X_AXIS, Math.PI / 2 );
					break;

				case 'z':
					break;

			}

			scene.matrix.premultiply( cachedTransform );
			scene.matrix.decompose( scene.position, scene.quaternion, scene.scale );
			scene.traverse( c => c.frustumCulled = false );

			cached.scene = scene;

			// We handle raycasting in a custom way so remove it from here
			scene.traverse( c => {

				c.raycast = emptyRaycast;

			} );

			const materials = [];
			const geometry = [];
			scene.traverse( c => {

				if ( c.geometry ) {

					geometry.push( c.geometry );

				}

				if ( c.material ) {

					materials.push( c.material );

				}

			} );

			cached.materials = materials;
			cached.geometry = geometry;

		} );

	}

	disposeTile( tile ) {

		const cached = tile.cached;
		if ( cached.scene ) {

			const scene = cached.scene;
			const materials = cached.materials;
			const geometry = cached.geometry;
			if ( scene.parent ) {

				scene.parent.remove( scene );

			}

			for ( let i = 0, l = geometry.length; i < l; i ++ ) {

				geometry[ i ].dispose();

			}

			for ( let i = 0, l = materials.length; i < l; i ++ ) {

				const material = materials[ i ];
				for ( const key in material ) {

					const value = material[ key ];
					if ( value && value.isTexture ) {

						value.dispose();

					}

				}
				material.dispose();

			}

			cached.scene = null;
			cached.materials = null;
			cached.geometry = null;

		}

		tile._loadIndex ++;

	}

	setTileVisible( tile, visible ) {

		const scene = tile.cached.scene;
		const visibleTiles = this.visibleTiles;
		const group = this.group;
		if ( visible ) {

			// TODO: Should set visible be called if the scene hasn't been loaded yet?
			// Ideally this would only be called on state change and when it's relevant
			if ( scene && ! scene.parent ) {

				group.add( scene );
				visibleTiles.add( tile );
				scene.updateMatrixWorld( true );

			}

		} else {

			group.remove( scene );
			visibleTiles.delete( tile );

		}

	}

	setTileActive( tile, active ) {

		const cached = tile.cached;
		const activeTiles = this.activeTiles;
		if ( active !== cached.active ) {

			cached.active = active;
			if ( active ) {

				activeTiles.add( tile );

			} else {

				activeTiles.delete( tile );

			}

		}

	}

	calculateError( tile ) {

		if ( tile.geometricError === 0.0 ) {

			return 0.0;

		}

		const cached = tile.cached;
		const cameras = this.cameras;

		// TODO: Use the content bounding volume here?
		const boundingVolume = tile.boundingVolume;
		const transformMat = cached.transform;
		const resolution = this.resolution;

		if ( 'box' in boundingVolume ) {

			const group = this.group;
			const boundingBox = cached.box;
			const obbMat = cached.boxTransform;

			// TODO: these can likely be cached? Or the world transform mat can be used
			// transformMat can be rolled into oobMat
			tempMat.copy( group.matrixWorld );
			tempMat.multiply( transformMat );
			tempMat.multiply( obbMat );
			tempMat.getInverse( tempMat );

			// NOTE: scale is inverted here.
			// assume the scales on all axes are uniform.
			let invScale;

			// account for tile scale.
			tempVector.setFromMatrixScale( tempMat );
			invScale = tempVector.x;

			if ( Math.abs( Math.max( tempVector.x - tempVector.y, tempVector.x - tempVector.z ) ) > 1e-6 ) {

				console.warn( 'ThreeTilesRenderer : Non uniform scale used for tile which may cause issues when calculating screen space error.' );

			}

			let minError = Infinity;
			for ( let i = 0, l = cameras.length; i < l; i ++ ) {

				// transform camera position into local frame of the tile bounding box
				const cam = cameras[ i ];
				tempVector.copy( cam.position );
				tempVector.applyMatrix4( tempMat );

				let error;
				if ( cam.isOrthographicCamera ) {

					const w = cam.right - cam.left;
					const h = cam.top - cam.bottom;
					const pixelSize = Math.max( h / resolution.height, w / resolution.width );
					error = tile.geometricError / ( pixelSize * invScale );

				} else {

					const distance = boundingBox.distanceToPoint( tempVector );
					const scaledDistance = distance * invScale;
					const sseDenominator = 2 * Math.tan( 0.5 * cam.fov * DEG2RAD );
					error = ( tile.geometricError * resolution.height ) / ( scaledDistance * sseDenominator );

					tile.cached.distance = scaledDistance;

				}

				minError = Math.min( minError, error );

			}

			return minError;

		} else if ( 'sphere' in boundingVolume ) {

			// const sphere = cached.sphere;

			console.warn( 'ThreeTilesRenderer : Sphere bounds not supported.' );

		} else if ( 'region' in boundingVolume ) {

			// unsupported
			console.warn( 'ThreeTilesRenderer : Region bounds not supported.' );

		}

		return Infinity;

	}

	tileInView( tile ) {

		// TODO: we should use the more precise bounding volumes here if possible
		// cache the root-space planes
		// Use separating axis theorem for frustum and obb

		const sphere = tile.cached.sphere;
		if ( sphere ) {

			_sphere.copy( sphere );
			_sphere.applyMatrix4( tile.cached.transform );

			const frustums = this.frustums;
			for ( let i = 0, l = frustums.length; i < l; i ++ ) {

				const frustum = frustums[ i ];
				if ( frustum.intersectsSphere( _sphere ) ) {

					return true;

				}

			}

			return false;

		}

		return true;

	}


}
