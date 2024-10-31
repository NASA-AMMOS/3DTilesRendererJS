import { createContext, useContext, useState, useEffect, useRef, forwardRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TilesRenderer as TilesRendererImpl } from '../../three/TilesRenderer.js';
import { useDeepOptions, useShallowOptions } from '../utilities/useOptions.jsx';
import { useObjectDep } from '../utilities/useObjectDep.jsx';
import { useForceUpdate } from '../utilities/useForceUpdate.jsx';

// context for accessing the tile set
export const TilesRendererContext = createContext( null );

// group that matches the transform of the tile set root group
function TileSetRoot( { children } ) {

	const tiles = useContext( TilesRendererContext );
	const ref = useRef();
	useEffect( () => {

		if ( tiles ) {

			ref.current.matrixWorld = tiles.group.matrixWorld;

		}

	}, [ tiles ] );

	return <group ref={ ref } matrixWorldAutoUpdate={ false } matrixAutoUpdate={ false }>{ children }</group>;

}

const _vec = /* @__PURE__ */ new Vector3();
export function EastNorthUpFrame( props ) {

	const {
		lat = 0,
		lon = 0,
		height = 0,
		az = 0,
		el = 0,
		roll = 0,
		children,
	} = props;
	const ref = useRef();
	const tiles = useContext( TilesRendererContext );
	const ellipsoid = tiles && tiles.ellipsoid || null;
	useEffect( () => {

		if ( ellipsoid === null ) {

			return;

		}

		const group = ref.current;
		group.matrix.identity();

		ellipsoid.getRotationMatrixFromAzElRoll( lat, lon, az, el, roll, group.matrix );
		ellipsoid.getCartographicToPosition( lat, lon, height, _vec );
		group.matrix.setPosition( _vec );
		group.matrix.decompose( group.position, group.quaternion, group.scale );
		group.updateMatrixWorld();

	}, [ ellipsoid, lat, lon, height, az, el, roll ] );

	return <group ref={ ref }>{ children }</group>;

}

// component for registering a plugin
export const TilesPlugin = forwardRef( function TilesPlugin( props, ref ) {

	const { plugin, args, ...options } = props;
	const tiles = useContext( TilesRendererContext );

	// create the instance
	const instance = useMemo( () => {

		if ( tiles === null ) {

			return null;

		}

		let instance;
		if ( Array.isArray( args ) ) {

			instance = new plugin( ...args );

		} else {

			instance = new plugin( args );

		}

		return instance;

		// we must create a new plugin if the tile set has changed

	}, [ tiles, plugin, useObjectDep( args ) ] ); // eslint-disable-line

	// assigns any provided options to the plugin
	useShallowOptions( instance, options );

	// assign ref
	useEffect( () => {

		if ( ref ) {

			if ( ref instanceof Function ) {

				ref( instance );

			} else {

				ref.current = instance;

			}

		}

	}, [ instance, ref ] );

	// register the instance
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		tiles.registerPlugin( instance );
		return () => {

			tiles.unregisterPlugin( instance );

		};

	}, [ instance, tiles ] );

} );

// component for adding a TilesRenderer to the scene
export const TilesRenderer = forwardRef( function TilesRenderer( props, ref ) {

	const { url, group = {}, children, ...options } = props;
	const [ tiles, setTiles ] = useState( null );
	const [ camera, gl, invalidate ] = useThree( state => [ state.camera, state.gl, state.invalidate ] );
	const [ forceUpdateIndex, forceUpdate ] = useForceUpdate();

	// create the tile set
	useEffect( () => {

		const tiles = new TilesRendererImpl( url );
		tiles.addEventListener( 'load-content', () => invalidate() );
		setTiles( tiles );

		return () => {

			tiles.dispose();

		};

	}, [ url, invalidate ] );

	// update the resolution for the camera
	useFrame( () => {

		if ( tiles === null ) {

			return;

		}

		camera.updateMatrixWorld();
		tiles.setResolutionFromRenderer( camera, gl );
		tiles.update();

	} );

	// add the camera
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		tiles.setCamera( camera );
		return () => {

			tiles.deleteCamera( camera );

		};

	}, [ tiles, camera ] );

	// assign ref
	useEffect( () => {

		if ( ref ) {

			if ( ref instanceof Function ) {

				ref( tiles );

			} else {

				ref.current = tiles;

			}

		}

	}, [ tiles, ref ] );

	// assign options recursively
	useDeepOptions( tiles, options );

	// because options modify tiles settings non-reactively we force an update and
	// pass the update index into the tiles context to force children to update
	useEffect( () => {

		forceUpdate();

	}, [ tiles, useObjectDep( options ) ] ); // eslint-disable-line

	return <>
		{ tiles ? <primitive object={ tiles.group } { ...group } /> : null }
		<TilesRendererContext.Provider value={ tiles } key={ forceUpdateIndex }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

} );
