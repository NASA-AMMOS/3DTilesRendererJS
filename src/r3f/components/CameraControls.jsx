import { forwardRef, useMemo, useEffect, useContext } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EnvironmentControls as EnvironmentControlsImpl } from '../../three/controls/EnvironmentControls.js';
import { GlobeControls as GlobeControlsImpl } from '../../three/controls/GlobeControls.js';
import { useShallowOptions } from '../utilities/useOptions.jsx';
import { TilesRendererContext } from './TilesRenderer.jsx';

// Add a base component implementation for both EnvironmentControls and GlobeControls
const ControlsBaseComponent = forwardRef( function ControlsBaseComponent( props, ref ) {

	const { controlsConstructor, domElement, scene, camera, tilesRenderer, ...rest } = props;

	const [ defaultCamera ] = useThree( state => [ state.camera ] );
	const [ gl ] = useThree( state => [ state.gl ] );
	const [ defaultScene ] = useThree( state => [ state.scene ] );
	const [ invalidate ] = useThree( state => [ state.invalidate ] );
	const [ get ] = useThree( state => [ state.get ] );
	const [ set ] = useThree( state => [ state.set ] );

	const defaultTilesRenderer = useContext( TilesRendererContext );
	const appliedCamera = camera || defaultCamera || null;
	const appliedScene = scene || defaultScene || null;
	const appliedDomElement = domElement || gl.domElement || null;
	const appliedTilesRenderer = tilesRenderer || defaultTilesRenderer || null;

	// create a controls instance
	const controls = useMemo( () => {

		return new controlsConstructor();

	}, [ controlsConstructor ] );

	// assign / call the reference
	useEffect( () => {

		if ( ref ) {

			if ( ref instanceof Function ) {

				ref( controls );

			} else {

				ref.current = controls;

			}

		}

	}, [ controls, ref ] );

	// fire invalidate callbacks
	useEffect( () => {

		const callback = () => invalidate();
		controls.addEventListener( 'change', callback );
		controls.addEventListener( 'start', callback );
		controls.addEventListener( 'end', callback );
		return () => {

			controls.removeEventListener( 'change', callback );
			controls.removeEventListener( 'start', callback );
			controls.removeEventListener( 'end', callback );

		};

	}, [ controls, invalidate ] );

	// assign the camera
	useEffect( () => {

		controls.setCamera( appliedCamera );

	}, [ controls, appliedCamera ] );

	// assign the scene
	useEffect( () => {

		controls.setScene( appliedScene );

	}, [ controls, appliedScene ] );

	// assign the tiles renderer
	useEffect( () => {

		controls.setTilesRenderer( appliedTilesRenderer );

	}, [ controls, appliedTilesRenderer ] );

	// attach to the dom element
	useEffect( () => {

		controls.attach( appliedDomElement );
		return () => {

			controls.detach();

		};

	}, [ controls, appliedDomElement ] );

	// set the controls for global use
	useEffect( () => {

		const old = get().controls;
		set( { controls } );
		return () => set( { controls: old } );

	}, [ controls, get, set ] );

	// update the controls with a priority of - 1 so it happens before tiles renderer update
	useFrame( () => {

		controls.update();

	}, - 1 );

	useShallowOptions( controls, rest );

} );

export function EnvironmentControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ EnvironmentControlsImpl } />;

}

export function GlobeControls( props ) {

	return <ControlsBaseComponent { ...props } controlsConstructor={ GlobeControlsImpl } />;

}
