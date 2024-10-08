import { createContext, useContext, useState, useEffect, useRef, forwardRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TilesRenderer as TilesRendererImpl } from '../three/TilesRenderer.js';
import { useDeepOptions, useShallowOptions, getDepsArray } from './utilities/useOptions.jsx';

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
	useEffect( () => {
		
		if ( tiles === null ) {

			return;

		}

		const group = ref.current;
		group.matrix.identity()

		tiles.ellipsoid.getRotationMatrixFromAzElRoll( lat, lon, az, el, roll, group.matrix );
		tiles.ellipsoid.getCartographicToPosition( lat, lon, height, _vec );
		group.matrix.setPosition( _vec );
		group.matrix.decompose( group.position, group.quaternion, group.scale );
		group.updateMatrixWorld();

	}, [ tiles, lat, lon, height, az, el, roll ] );

	return <group ref={ ref }>{ children }</group>;

}

// component for registering a plugin
export const TilesPlugin = forwardRef( ( props, ref ) => {

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
	}, [ tiles, plugin ] );

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

	}, [ plugin, tiles, ...getDepsArray( args ) ] );

} );

// component for adding a TilesRenderer to the scene
export const TilesRenderer = forwardRef( ( props, ref ) => {

	const { url, children, ...options } = props;
	const [ tiles, setTiles ] = useState( null );
	const [ camera, gl, invalidate ] = useThree( state => [ state.camera, state.gl, state.invalidate ] );

	// create the tile set
	useEffect( () => {

		const tiles = new TilesRendererImpl( url );
		tiles.addEventListener( 'load-content', () => invalidate() );
		setTiles( tiles );

		return () => {

			tiles.dispose();

		};

	}, [ url ] );

	// update the resolution for the camera
	useFrame( () => {

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

	return <>
		{ tiles ? <primitive object={ tiles.group }/> : null }
		<TilesRendererContext.Provider value={ tiles }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

} );
