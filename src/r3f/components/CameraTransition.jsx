import { forwardRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraTransitionManager } from '../../three/controls/CameraTransitionManager.js';
import { useDeepOptions } from '../utilities/useOptions.js';
import { useApplyRefs } from '../utilities/useApplyRefs.js';

export const CameraTransition = forwardRef( function CameraTransition( props, ref ) {

	const {
		mode = 'perspective',
		onBeforeToggle,
		perspectiveCamera,
		orthographicCamera,
		...options
	} = props;

	const [ set, get, invalidate, controls, camera, size ] = useThree( state => [ state.set, state.get, state.invalidate, state.controls, state.camera, state.size ] );

	// create the manager
	const manager = useMemo( () => {

		const manager = new CameraTransitionManager();
		manager.autoSync = false;

		if ( camera.isOrthographicCamera ) {

			manager.orthographicCamera.copy( camera );
			manager.mode = 'orthographic';

		} else {

			manager.perspectiveCamera.copy( camera );

		}

		manager.syncCameras();
		manager.mode = mode;

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
	useApplyRefs( manager, ref );

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

			// calculate the camera being toggled to. Because "toggle" has not yet been
			// called this will select the camera that is being transitioned to.
			const targetCamera = mode === 'orthographic' ? manager.orthographicCamera : manager.perspectiveCamera;
			if ( onBeforeToggle ) {

				onBeforeToggle( manager, targetCamera );

			} else if ( controls && controls.isEnvironmentControls ) {

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

	}, [ mode, manager, invalidate, controls, onBeforeToggle ] );

	// rerender the frame when the transition animates
	useEffect( () => {

		const callback = () => invalidate();
		manager.addEventListener( 'transition-start', callback );
		manager.addEventListener( 'change', callback );
		manager.addEventListener( 'transition-end', callback );

		return () => {

			manager.removeEventListener( 'transition-start', callback );
			manager.removeEventListener( 'change', callback );
			manager.removeEventListener( 'transition-end', callback );

		};

	}, [ manager, invalidate ] );

	useDeepOptions( manager, options );

	// update animation
	useFrame( () => {

		manager.update();
		if ( controls ) {

			controls.enabled = ! manager.animating;

		}

		// ensure the orthographic camera size is resized correctly if the user is not
		// providing their own camera.
		const { camera, size } = get();
		if ( ! orthographicCamera && camera === manager.orthographicCamera ) {

			const aspect = size.width / size.height;
			const camera = manager.orthographicCamera;
			if ( aspect !== camera.right ) {

				camera.bottom = - 1;
				camera.top = 1;
				camera.left = - aspect;
				camera.right = aspect;
				camera.updateProjectionMatrix();

			}

		}

		if ( manager.animating ) {

			invalidate();

		}

	}, - 1 );

} );
