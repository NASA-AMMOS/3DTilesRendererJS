import { createContext, useContext, useEffect, useRef, forwardRef, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TilesRenderer as TilesRendererImpl } from '../../three/TilesRenderer.js';
import { useDeepOptions, useShallowOptions } from '../utilities/useOptions.js';
import { useObjectDep } from '../utilities/useObjectDep.js';
import { useApplyRefs } from '../utilities/useApplyRefs.js';

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
	const invalidate = useThree( state => state.invalidate );
	const updateCallback = useCallback( () => {

		// hide the group if the tiles aren't loaded yet
		const ellipsoid = tiles && tiles.ellipsoid || null;
		const group = ref.current;
		group.matrix.identity();
		group.visible = Boolean( tiles && tiles.root );

		if ( ellipsoid === null ) {

			return;

		}

		ellipsoid.getFrame( lat, lon, az, el, roll, height, group.matrix );
		group.matrix.decompose( group.position, group.quaternion, group.scale );
		group.updateMatrixWorld();
		invalidate();

	}, [ invalidate, tiles, lat, lon, height, az, el, roll ] );

	useEffect( () => {

		updateCallback();

	}, [ updateCallback ] );

	useEffect( () => {

		tiles.addEventListener( 'load-tile-set', updateCallback );
		return () => {

			tiles.removeEventListener( 'load-tile-set', updateCallback );

		};

	}, [ tiles, updateCallback ] );

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
	useApplyRefs( instance, ref );

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

	const { url, group = {}, enabled = true, children, ...options } = props;
	const [ camera, gl, invalidate ] = useThree( state => [ state.camera, state.gl, state.invalidate ] );

	const tiles = useMemo( () => {

		return new TilesRendererImpl( url );

	}, [ url ] );

	// create the tile set
	useEffect( () => {

		tiles.addEventListener( 'load-tile-set', () => invalidate() );
		tiles.addEventListener( 'load-content', () => invalidate() );
		tiles.addEventListener( 'force-rerender', () => invalidate() );
		return () => {

			tiles.dispose();

		};

	}, [ tiles, invalidate ] );

	// update the resolution for the camera
	useFrame( () => {

		if ( tiles === null || ! enabled ) {

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
	useApplyRefs( tiles, ref );

	// assign options recursively
	useDeepOptions( tiles, options );

	return <>
		<primitive object={ tiles.group } { ...group } />
		<TilesRendererContext.Provider value={ tiles }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

} );
