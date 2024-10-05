import { forwardRef, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EnvironmentControls as EnvironmentControlsImpl } from '../three/controls/EnvironmentControls.js';
import { GlobeControls as GlobeControlsImpl } from '../three/controls/GlobeControls.js';
import { useOptions } from './utilities/useOptions.jsx';
import { TilesRendererContext } from './TilesRendererComponent.jsx';

const ControlsBaseComponent = forwardRef( ( props, ref ) => {

	const { controlsConstructor, domElement, scene, camera, tilesRenderer, ...rest } = props;
	const [ defaultCamera, gl, defaultScene ] = useThree( state => [ state.camera, state.gl, state.scene ] );
	const defaultTilesRenderer = useContext( TilesRendererContext );
	const appliedCamera = camera || defaultCamera || null;
	const appliedScene = scene || defaultScene || null;
	const appliedDomElement = domElement || gl.domElement || null;
	const appliedTilesRenderer = tilesRenderer || defaultTilesRenderer || null;

	const controls = useMemo( () => new EnvironmentControlsImpl(), [ controlsConstructor ] );

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

	useOptions( controls, rest );

} );

export function EnvironmentControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ EnvironmentControlsImpl } />

}

export function GlobeControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ GlobeControlsImpl } />

}
