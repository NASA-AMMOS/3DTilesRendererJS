import { TilesRenderer } from '../base/TilesRenderer.js';
import { ThreeB3DMLoader } from './ThreeB3DMLoader.js';
import { TilesGroup } from './TilesGroup.js';
import {
	Matrix4,
	Box3,
	Sphere,
	Vector3,
	Group,
	Vector2,
	Math as MathUtils,
	Box3Helper,
	Quaternion,
	Frustum,
	Ray,
	Mesh
} from 'three';

const DEG2RAD = MathUtils.DEG2RAD;
const tempMat = new Matrix4();
const tempQuaternion = new Quaternion();
const tempVector = new Vector3();
const resVector = new Vector2();
const vecX = new Vector3();
const vecY = new Vector3();
const vecZ = new Vector3();
const ray = new Ray();
const _sphere = new Sphere();

function emptyRaycast () {};

class ThreeTilesRenderer extends TilesRenderer {

	get displayBounds() {

		return this._displayBounds;

	}

	set displayBounds( val ) {

		if ( val !== this.displayBounds ) {

			this._displayBounds = val;
			this.traverse( t => {

				const scene = t.cached.scene;
				const boxHelper = t.cached.boxHelper;
				if ( scene ) {

					if ( val ) {

						scene.add( boxHelper );
						boxHelper.updateMatrixWorld( true );

					} else {

						scene.remove( boxHelper );

					}

				}

			} );

		}

	}

	constructor( url, cameras, renderer ) {

		super( url );
		this.group = new TilesGroup( this );
		this.cameras = Array.isArray( cameras ) ? cameras : [ cameras ];
		this.frustums = [];
		this.renderer = renderer;
		this.activeSet = new Set();
		this.visibleSet = new Set();

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

		const activeSet = this.activeSet;
		const group = this.group;
		this.traverse( tile => {

			const cached = tile.cached;
			const groupMatrixWorld = group.matrixWorld;
			const transformMat = cached.transform;

			tempMat.copy( groupMatrixWorld );
			tempMat.multiply( transformMat );

			const sphere = cached.sphere;
			if ( sphere ) {

				_sphere.copy( sphere );
				_sphere.applyMatrix4( tempMat );
				if ( ! raycaster.ray.intersectsSphere( _sphere ) ) {

					return true;

				}

			}

			const boundingBox = cached.box;
			const obbMat = cached.boxTransform;
			if ( boundingBox ) {

				tempMat.multiply( obbMat );
				tempMat.getInverse( tempMat );
				ray.copy( raycaster.ray ).applyMatrix4( tempMat );
				if ( ! ray.intersectsBox( boundingBox ) ) {

					return true;

				}

			}

			// TODO: check region

			const scene = cached.scene;
			if ( activeSet.has( scene ) ) {

				raycaster.intersectObject( scene, true, intersects );
				scene.traverse( c => {

					if ( c !== cached.boxHelper ) {

						Object.getPrototypeOf( c ).raycast.call( c, raycaster, intersects );

					}

				} );
				return true;

			}

		} );

	}

	/* Overriden */
	update() {

		const group = this.group;
		const renderer = this.renderer;
		const cameras = this.cameras;
		const frustums = this.frustums;

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
			frustum.setFromMatrix( tempMat );

		}

		// store the resolution of the render
		renderer.getSize( resVector );
		resVector.multiplyScalar( renderer.getPixelRatio() );

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

			boxHelper: null,
			scene: null,

		};

	}

	parseTile( buffer, tile ) {

		tile._loadIndex = tile._loadIndex || 0;
		tile._loadIndex ++;

		// TODO: 90 degree rotation must be applied to GLTF file to resolve "up"
		const loadIndex = tile._loadIndex;
		return new ThreeB3DMLoader().parse( buffer ).then( res => {

			if ( tile._loadIndex !== loadIndex ) {

				return;

			}

			const cached = tile.cached;
			const cachedBox = cached.box;
			const cachedBoxMat = cached.boxTransform;

			// add a helper group to represent the obb rotation matrix
			const boxHelper = new Box3Helper( cachedBox );
			const boxHelperGroup = new Group();
			cachedBoxMat.decompose( boxHelperGroup.position, boxHelperGroup.quaternion, boxHelperGroup.scale );
			boxHelperGroup.add( boxHelper );
			boxHelperGroup.updateMatrixWorld( true );

			const scene = res.scene;
			cached.transform.decompose( scene.position, scene.quaternion, scene.scale );
			scene.traverse( c => c.frustumCulled = false );

			cached.boxHelper = boxHelperGroup;
			cached.scene = res.scene;

			if ( this.displayBounds ) {

				cached.scene.add( cached.boxHelper );

			}

			// We handle raycasting in a custom way so remove it from here
			boxHelper.raycast = emptyRaycast;
			scene.traverse( c => {

				c.raycast = emptyRaycast;

			} );

		} );

	}

	disposeTile( tile ) {

		const cached = tile.cached;
		if ( cached.scene ) {

			const scene = cached.scene;
			if ( scene.parent ) {

				scene.parent.remove( scene );

			}

			scene.traverse( c => {

				if ( c.geometry ) {

					c.geometry.dispose();

				}

				if ( c.material ) {

					c.material.dispose();

					// TODO: dispose textures

				}

			} );
			cached.scene = null;
			cached.boxHelper = null;

		}

		tile._loadIndex ++;

	}

	setTileVisible( tile, visible ) {

		const scene = tile.cached.scene;
		const visibleSet = this.visibleSet;
		const group = this.group;
		if ( visible ) {

			if ( scene && ! scene.parent ) {

				group.add( scene );
				visibleSet.add( scene );
				scene.updateMatrixWorld( true );

			}

		} else {

			group.remove( scene );
			visibleSet.delete( scene );

		}

	}

	setTileActive( tile, active ) {

		const cached = tile.cached;
		const activeSet = this.activeSet;
		if ( active !== cached.active ) {

			cached.active = active;
			if ( active ) {

				activeSet.add( cached.scene );

			} else {

				activeSet.delete( cached.scene );

			}

		}

	}

	calculateError( tile ) {

		const cached = tile.cached;
		const cameras = this.cameras;

		// TODO: Use the content bounding volume here?
		const boundingVolume = tile.boundingVolume;
		const transformMat = cached.transform;

		if ( 'box' in boundingVolume ) {

			const group = this.group;
			const boundingBox = cached.box;
			const obbMat = cached.boxTransform;

			// TODO: these can likely be cached? Or the world transform mat can be used
			// transformMat can be rolled into oobMat
			tempMat.copy( transformMat );
			tempMat.multiply( obbMat );
			tempMat.getInverse( tempMat );

			let minError = Infinity;
			for ( let i = 0, l = cameras.length; i < l; i ++ ) {

				// transform camera position into local frame of the tile bounding box
				const cam = cameras[ i ];
				tempVector.copy( cam.position );
				tempVector.applyMatrix4( tempMat );

				let error;
				if ( cam.isOrthographic ) {

					const w = cam.right - cam.left;
					const h = cam.top - cam.bottom;
					const pixelSize = Math.Max( h, w ) / Math.Max( resVector.width, resVector.height );
					error = tile.geometricError / pixelSize;

				} else {

					const distance = boundingBox.distanceToPoint( tempVector );

					// assume the scales on all axes are uniform.
					let scale;

					// account for tile scale.
					tempVector.setFromMatrixScale( tempMat );
					scale = tempVector.x;

					// account for parent group scale. Divide because this matrix has not been inverted like the previous one.
					tempVector.setFromMatrixScale( group.matrixWorld );
					scale /= tempVector.x;

					if ( Math.abs( Math.max( scale.x - scale.y, scale.x - scale.z ) ) > 1e-6 ) {

						console.warn( 'ThreeTilesRenderer : Non uniform scale used for tile which may cause issues when claculating screen space error.' );

					}

					const scaledDistance = distance * scale;
					const sseDenominator = 2 * Math.tan( 0.5 * cam.fov * DEG2RAD );
					error = ( tile.geometricError * resVector.height ) / ( scaledDistance * sseDenominator );

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

export { ThreeTilesRenderer };
