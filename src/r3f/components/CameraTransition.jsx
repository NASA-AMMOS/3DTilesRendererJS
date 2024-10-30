import { forwardRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EnvironmentControls } from '../../three/controls/EnvironmentControls.js';
import { CameraTransitionManager } from '../../../example/src/camera/CameraTransitionManager.js';

export const CameraTransition = forwardRef( function CameraTransition( props, ref ) {

	const { mode, onTransitionStart, onTransitionEnd } = props;
	const [ set, invalidate, controls, camera ] = useThree( state => [ state.get, state.set, state.invalidate, camera ] );

	// inherit the default camera
	let { perspectiveCamera, orthographicCamera } = props;
	if ( ! orthographicCamera && camera.isOrthographicCamera ) orthographicCamera = camera;
	if ( ! perspectiveCamera && camera.isPerspectiveCamera ) perspectiveCamera = camera;

	// create the manager
	const manager = useMemo( () => {

		const manager = new CameraTransitionManager();
		manager.autoSync = false;
		return manager;

	}, [] );

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

			set( { camera } );

		};

		set( { camera: manager.camera } );
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

		set( { camera: manager.camera } );

		return () => {

			manager.perspectiveCamera = oldPerspectiveCamera;
			manager.orthographicCamera = oldOrthographicCamera;

		};

	}, [ perspectiveCamera, orthographicCamera, manager, set ] );

	// triggle toggle
	useEffect( () => {

		const toOrtho = mode === 'ortho';
		const isOrtho = manager.camera.isOrthographicCamera;
		if ( toOrtho !== isOrtho ) {

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
