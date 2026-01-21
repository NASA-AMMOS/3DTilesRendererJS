import { TilesRendererBase, LoaderUtils } from '3d-tiles-renderer/core';
import { TransformNode, Matrix, Vector3, Frustum, Observable, Plane } from '@babylonjs/core';
import { B3DMLoader } from '../loaders/B3DMLoader.js';
import { GLTFLoader } from '../loaders/GLTFLoader.js';
import { TileBoundingVolume } from '../math/TileBoundingVolume.js';

// Scratch variables to avoid allocations
const _worldToTiles = /* @__PURE__ */ Matrix.Identity();
const _cameraPositionInTiles = /* @__PURE__ */ new Vector3();
const _frustumPlanes = /* @__PURE__ */ new Array( 6 ).fill( null ).map( () => new Plane( 0, 0, 0, 0 ) );

// TODO: implementation does not support left handed coordinate system
export class TilesRenderer extends TilesRendererBase {

	constructor( url, scene ) {

		super( url );

		this.scene = scene;
		this.group = new TransformNode( 'tiles-root', scene );
		this._upRotationMatrix = Matrix.Identity();

		// Babylon.js Observables for events
		this._observables = new Map();

	}

	/**
	 * Get or create an observable for the given event type
	 * @param {string} type - Event type name
	 * @returns {Observable} The observable for this event type
	 */
	getObservable( type ) {

		if ( ! this._observables.has( type ) ) {

			this._observables.set( type, new Observable() );

		}

		return this._observables.get( type );

	}

	// Event handling - adapter for TilesRendererBase using Babylon Observables
	addEventListener( type, listener ) {

		const observable = this.getObservable( type );
		observable.add( listener );

	}

	removeEventListener( type, listener ) {

		if ( ! this._observables.has( type ) ) {

			return;

		}

		const observable = this._observables.get( type );
		observable.removeCallback( listener );

	}

	dispatchEvent( event ) {

		if ( ! this._observables.has( event.type ) ) {

			return;

		}

		const observable = this._observables.get( event.type );
		observable.notifyObservers( event );

	}

	loadRootTileset( ...args ) {

		return super.loadRootTileset( ...args )
			.then( root => {

				// cache the gltf tileset rotation matrix
				const { asset } = root;
				const upAxis = asset && asset.gltfUpAxis || 'y';
				switch ( upAxis.toLowerCase() ) {

					case 'x':
						Matrix.RotationYToRef( - Math.PI / 2, this._upRotationMatrix );
						break;

					case 'y':
						Matrix.RotationXToRef( Math.PI / 2, this._upRotationMatrix );
						break;

				}

				return root;

			} );

	}

	preprocessNode( tile, tilesetDir, parentTile = null ) {

		super.preprocessNode( tile, tilesetDir, parentTile );

		// Build the transform matrix for this tile
		const transform = Matrix.Identity();
		if ( tile.transform ) {

			// 3d tiles uses column major
			Matrix.FromValuesToRef( ...tile.transform, transform );

		}

		if ( parentTile ) {

			// parentTransform * transform
			transform.multiplyToRef( parentTile.cached.transform, transform );

		}

		const transformInverse = Matrix.Identity();
		transform.invertToRef( transformInverse );
		const boundingVolume = new TileBoundingVolume();
		if ( 'sphere' in tile.boundingVolume ) {

			boundingVolume.setSphereData( ...tile.boundingVolume.sphere, transform );

		}

		if ( 'box' in tile.boundingVolume ) {

			boundingVolume.setObbData( tile.boundingVolume.box, transform );

		}

		tile.cached = {
			transform,
			transformInverse,
			boundingVolume,
			active: false,
			group: null,
			container: null,
		};

	}

	async parseTile( buffer, tile, extension, uri, abortSignal ) {

		const cached = tile.cached;
		const scene = this.scene;
		const workingPath = LoaderUtils.getWorkingPath( uri );
		const fetchOptions = this.fetchOptions;

		const tileTransform = cached.transform;
		const upRotationMatrix = this._upRotationMatrix;

		let result = null;
		const fileType = ( LoaderUtils.readMagicBytes( buffer ) || extension ).toLowerCase();

		switch ( fileType ) {

			case 'b3dm': {

				const loader = new B3DMLoader( scene );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.adjustmentTransform.copyFrom( upRotationMatrix );

				result = await loader.parse( buffer, uri );
				break;

			}

			case 'gltf':
			case 'glb': {

				const loader = new GLTFLoader( scene );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.adjustmentTransform.copyFrom( upRotationMatrix );

				result = await loader.parse( buffer, uri );
				break;

			}

			default:
				throw new Error( `BabylonTilesRenderer: Content type "${ fileType }" not supported.` );

		}

		const group = result.scene;
		group.setEnabled( false );

		// apply the tile's cached transform to the loaded scene
		group
			.computeWorldMatrix( true )
			.multiply( tileTransform )
			.decompose( group.scaling, group.rotationQuaternion, group.position );

		// exit early if a new request has already started
		if ( abortSignal.aborted ) {

			result.container.dispose();
			return;

		}

		cached.group = group;
		cached.container = result.container;

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const cached = tile.cached;
		if ( cached.container ) {

			cached.container.dispose();
			cached.container = null;
			cached.group = null;

		}

	}

	setTileVisible( tile, visible ) {

		const cached = tile.cached;
		const group = cached.group;

		if ( ! group ) {

			return;

		}

		if ( visible ) {

			group.parent = this.group;
			group.setEnabled( true );

		} else {

			group.parent = null;
			group.setEnabled( false );

		}

		super.setTileVisible( tile, visible );

	}

	calculateBytesUsed( tile ) {

		// TODO: return the estimated amount of bytes used by the renderer
		return 1;

	}

	calculateTileViewError( tile, target ) {

		// TODO: cache frustum planes etc to improve performance
		const { scene } = this;

		const cached = tile.cached;
		const boundingVolume = cached.boundingVolume;
		const camera = scene.activeCamera;

		// get the render resolution
		const engine = scene.getEngine();
		const hardwareScaling = engine.getHardwareScalingLevel();
		const width = engine.getRenderWidth() * hardwareScaling;
		const height = engine.getRenderHeight() * hardwareScaling;

		// get projection camera info
		const projection = camera.getProjectionMatrix();
		const projectionElements = projection.m;
		const isOrthographic = projectionElements[ 15 ] === 1;

		// calculate SSE denominator or pixel size
		let sseDenominator;
		let pixelSize;
		if ( isOrthographic ) {

			const w = 2 / projectionElements[ 0 ];
			const h = 2 / projectionElements[ 5 ];
			pixelSize = Math.max( h / height, w / width );

		} else {

			sseDenominator = ( 2 / projectionElements[ 5 ] ) / height;

		}

		// calculate the frustum planes and camera position
		// Note: if tiles.group has no transform, _worldToTiles is identity
		this.group.getWorldMatrix().invertToRef( _worldToTiles );
		Vector3.TransformCoordinatesToRef( camera.globalPosition, _worldToTiles, _cameraPositionInTiles );

		// get frustum from camera transformation matrix
		Frustum.GetPlanesToRef( camera.getTransformationMatrix( true ), _frustumPlanes );

		const distance = boundingVolume.distanceToPoint( _cameraPositionInTiles );

		let error;
		if ( isOrthographic ) {

			error = tile.geometricError / pixelSize;

		} else {

			// Avoid dividing by 0
			error = distance === 0 ? Infinity : tile.geometricError / ( distance * sseDenominator );

		}

		// Check frustum intersection
		const inView = boundingVolume.intersectsFrustum( _frustumPlanes );

		target.inView = inView;
		target.error = error;
		target.distanceFromCamera = distance;

	}

	dispose() {

		super.dispose();
		this.group.dispose();

	}

}
