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

	addEventListener( type, listener ) {

		if ( ! this._observables.has( type ) ) {

			this._observables.set( type, new Observable() );

		}

		this._observables.get( type ).add( listener );

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
			transform.multiplyToRef( parentTile.engineData.transform, transform );

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

		tile.engineData.transform = transform;
		tile.engineData.transformInverse = transformInverse;
		tile.engineData.boundingVolume = boundingVolume;
		tile.engineData.active = false;
		tile.engineData.scene = null;
		tile.engineData.container = null;

	}

	async parseTile( buffer, tile, extension, uri, abortSignal ) {

		const engineData = tile.engineData;
		const rootScene = this.scene;
		const workingPath = LoaderUtils.getWorkingPath( uri );
		const fetchOptions = this.fetchOptions;

		const tileTransform = engineData.transform;
		const upRotationMatrix = this._upRotationMatrix;

		let result = null;
		const fileType = ( LoaderUtils.readMagicBytes( buffer ) || extension ).toLowerCase();

		switch ( fileType ) {

			case 'b3dm': {

				const loader = new B3DMLoader( rootScene );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.adjustmentTransform.copyFrom( upRotationMatrix );

				result = await loader.parse( buffer, uri );
				break;

			}

			case 'gltf':
			case 'glb': {

				const loader = new GLTFLoader( rootScene );
				loader.workingPath = workingPath;
				loader.fetchOptions = fetchOptions;
				loader.adjustmentTransform.copyFrom( upRotationMatrix );

				result = await loader.parse( buffer, uri, extension );
				break;

			}

			default:
				throw new Error( `BabylonTilesRenderer: Content type "${ fileType }" not supported.` );

		}

		const scene = result.scene;
		scene.setEnabled( false );

		// apply the tile's cached transform to the loaded scene
		scene
			.computeWorldMatrix( true )
			.multiply( tileTransform )
			.decompose( scene.scaling, scene.rotationQuaternion, scene.position );

		// exit early if a new request has already started
		if ( abortSignal.aborted ) {

			result.container.dispose();
			return;

		}

		engineData.scene = scene;
		engineData.container = result.container;
		engineData.metadata = result.metadata || null;

	}

	disposeTile( tile ) {

		super.disposeTile( tile );

		const engineData = tile.engineData;
		if ( engineData.container ) {

			engineData.container.dispose();
			engineData.container = null;
			engineData.scene = null;
			engineData.metadata = null;

		}

	}

	setTileVisible( tile, visible ) {

		const engineData = tile.engineData;
		const scene = engineData.scene;

		if ( ! scene ) {

			return;

		}

		if ( visible ) {

			scene.parent = this.group;
			scene.setEnabled( true );

		} else {

			scene.parent = null;
			scene.setEnabled( false );

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

		const engineData = tile.engineData;
		const boundingVolume = engineData.boundingVolume;
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

		// calculate the frustum planes and distances in local tile coordinates
		this.group.getWorldMatrix().invertToRef( _worldToTiles );
		Vector3.TransformCoordinatesToRef( camera.globalPosition, _worldToTiles, _cameraPositionInTiles );

		// get frustums in local space: note tht it seems there's no way to transform to ref in Babylon
		Frustum.GetPlanesToRef( camera.getTransformationMatrix( true ), _frustumPlanes );
		const frustumPlanes = _frustumPlanes.map( plane => {

			return plane.transform( _worldToTiles );

		} );

		const distance = boundingVolume.distanceToPoint( _cameraPositionInTiles );

		let error;
		if ( isOrthographic ) {

			error = tile.geometricError / pixelSize;

		} else {

			// Avoid dividing by 0
			error = distance === 0 ? Infinity : tile.geometricError / ( distance * sseDenominator );

		}

		// Check frustum intersection
		const inView = boundingVolume.intersectsFrustum( frustumPlanes );

		target.inView = inView;
		target.error = error;
		target.distanceFromCamera = distance;

	}

	dispose() {

		super.dispose();
		this.group.dispose();

	}

}
