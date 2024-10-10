import { forwardRef, useMemo, useEffect, useContext } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EnvironmentControls as EnvironmentControlsImpl } from '../three/controls/EnvironmentControls.js';
import { GlobeControls as GlobeControlsImpl } from '../three/controls/GlobeControls.js';
import { useShallowOptions } from './utilities/useOptions.jsx';
import { TilesRendererContext } from './TilesRenderer.jsx';

const ControlsBaseComponent = forwardRef( function ControlsBaseComponent( props, ref ) {

	const { controlsConstructor, domElement, scene, camera, tilesRenderer, ...rest } = props;
	const [ defaultCamera, gl, defaultScene, invalidate ] = useThree( state => [ state.camera, state.gl, state.scene, state.invalidate ] );
	const defaultTilesRenderer = useContext( TilesRendererContext );
	const appliedCamera = camera || defaultCamera || null;
	const appliedScene = scene || defaultScene || null;
	const appliedDomElement = domElement || gl.domElement || null;
	const appliedTilesRenderer = tilesRenderer || defaultTilesRenderer || null;

	const controls = useMemo( () => new controlsConstructor(), [ controlsConstructor ] );

	useEffect( () => {

		if ( ref ) {

			if ( ref instanceof Function ) {

				ref( controls );

			} else {

				ref.current = controls;

			}

		}

	}, [ controls, ref ] );

	useEffect( () => {

		const callback = e => invalidate();
		controls.addEventListener( 'change', callback );
		controls.addEventListener( 'start', callback );
		controls.addEventListener( 'end', callback );
		return () => {

			controls.removeEventListener( 'change', callback );
			controls.removeEventListener( 'start', callback );
			controls.removeEventListener( 'end', callback );

		};

	}, [ controls, invalidate ] );

	useEffect( () => {

		controls.setCamera( appliedCamera );

	}, [ controls, appliedCamera ] );

	useEffect( () => {

		controls.setScene( appliedScene );

	}, [ controls, appliedScene ] );

	useEffect( () => {

		controls.setTilesRenderer( appliedTilesRenderer );

	}, [ controls, appliedTilesRenderer ] );

	useEffect( () => {

		controls.attach( appliedDomElement );
		return () => {

			controls.detach();

		};

	}, [ controls, appliedDomElement ] );

	useFrame( () => {

		controls.update();

	} );

	useShallowOptions( controls, rest );

} );

export function EnvironmentControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ EnvironmentControlsImpl } />;

}

export function GlobeControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ GlobeControlsImpl } />;

}
