import { forwardRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EnvironmentControls } from '../../three/controls/EnvironmentControls.js';
import { CameraTransitionManager } from '../../../example/src/camera/CameraTransitionManager.js';

export const CameraTransition = forwardRef( function CameraTransition( props, ref ) {

	const { mode, onTransitionStart, onTransitionEnd, perspectiveCamera, orthographicCamera } = props;
	const [ set, invalidate, controls, camera, size ] = useThree( state => [ state.set, state.invalidate, state.controls, state.camera, state.size ] );

	// create the manager
	const manager = useMemo( () => {

		const manager = new CameraTransitionManager();
		manager.autoSync = false;

		if ( camera.isOrthographicCamera ) {

			manager.orthographicCamera.copy( camera );

		} else {

			manager.perspectiveCamera.copy( camera );

		}

		return manager;

		// only respect the camera initially so the default camera settings are automatically used

	}, [] );

	useEffect( () => {

		const { perspectiveCamera, orthographicCamera } = manager;
		const aspect = size.width / size.height;
		perspectiveCamera.aspect = aspect;
		perspectiveCamera.updateProjectionMatrix();

		orthographicCamera.left = - orthographicCamera.top * aspect;
		orthographicCamera.right = - orthographicCamera.left;
		perspectiveCamera.updateProjectionMatrix();

	}, [ manager, size ] );

	// assign ref
	useEffect( () => {

		if ( ref ) {

			if ( ref instanceof Function ) {

				ref( manager );

			} else {

				ref.current = manager;

			}

		}

	}, [ manager, ref ] );

	// set the camera
	useEffect( () => {

		const cameraCallback = ( { camera } ) => {

			set( () => ( { camera } ) );

		};

		set( () => ( { camera: manager.camera } ) );
		manager.addEventListener( 'camera-change', cameraCallback );
		return () => {

			manager.removeEventListener( 'camera-change', cameraCallback );

		};

	}, [ manager, set ] );

	// register for events
	useEffect( () => {

		if ( onTransitionEnd ) {

			manager.addEventListener( 'transition-end', onTransitionEnd );
			return () => manager.removeEventListener( 'transition-end', onTransitionEnd );

		}

	}, [ onTransitionEnd, manager ] );

	useEffect( () => {

		if ( onTransitionStart ) {

			manager.addEventListener( 'transition-start', onTransitionStart );
			return () => manager.removeEventListener( 'transition-start', onTransitionStart );

		}

	}, [ onTransitionStart, manager ] );

	// assign cameras
	useEffect( () => {

		const oldPerspectiveCamera = manager.perspectiveCamera;
		const oldOrthographicCamera = manager.orthographicCamera;
		manager.perspectiveCamera = perspectiveCamera || oldPerspectiveCamera;
		manager.orthographicCamera = orthographicCamera || oldOrthographicCamera;

		set( () => ( { camera: manager.camera } ) );

		return () => {

			manager.perspectiveCamera = oldPerspectiveCamera;
			manager.orthographicCamera = oldOrthographicCamera;

		};

	}, [ perspectiveCamera, orthographicCamera, manager, set ] );

	// toggle
	useEffect( () => {

		if ( mode !== manager.mode ) {

			if ( controls && controls instanceof EnvironmentControls ) {

				controls.getPivotPoint( manager.fixedPoint );
				manager.syncCameras();
				controls.adjustCamera( manager.perspectiveCamera );
				controls.adjustCamera( manager.orthographicCamera );

			} else {

				manager.fixedPoint
					.set( 0, 0, - 1 )
					.transformDirection( manager.camera.matrixWorld )
					.multiplyScalar( 50 )
					.add( manager.camera.position );
				manager.syncCameras();

			}

			manager.toggle();
			invalidate();

		}

	}, [ mode, manager, invalidate, controls ] );

	// update animation
	useFrame( () => {

		manager.update();
		if ( controls ) {

			controls.enabled = ! manager.animating;

		}

		if ( manager.animating ) {

			invalidate();

		}

	} );

} );
