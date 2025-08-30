import { createContext, useContext, useEffect, useRef, forwardRef, useCallback, useState, useLayoutEffect, useReducer } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import { TilesRenderer as TilesRendererImpl, WGS84_ELLIPSOID } from '3d-tiles-renderer/three';
import { useDeepOptions } from '../utilities/useOptions.js';
import { useObjectDep } from '../utilities/useObjectDep.js';
import { useApplyRefs } from '../utilities/useApplyRefs.js';

// context for accessing the tile set
export const TilesRendererContext = createContext( null );
export const TilesPluginContext = createContext( null );

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
		ellipsoid = WGS84_ELLIPSOID.clone(),
		children,
	} = props;
	const tiles = useContext( TilesRendererContext );
	const invalidate = useThree( state => state.invalidate );
	const [ group, setGroup ] = useState( null );
	const updateCallback = useCallback( () => {

		if ( group === null ) {

			return;

		}

		// hide the group if the tiles aren't loaded yet
		const localEllipsoid = tiles && tiles.ellipsoid || ellipsoid || null;
		group.matrix.identity();
		group.visible = Boolean( tiles && tiles.root || ellipsoid );

		if ( localEllipsoid === null ) {

			return;

		}

		localEllipsoid.getOrientedEastNorthUpFrame( lat, lon, height, az, el, roll, group.matrix );
		group.matrix.decompose( group.position, group.quaternion, group.scale );
		group.updateMatrixWorld();
		invalidate();

	}, [ invalidate, tiles, lat, lon, height, az, el, roll, ellipsoid, group, useObjectDep( ellipsoid.radius ) ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// adjust the matrix world update logic if a tile set is present so that we can position the frame
	// correctly regardless of the parent.
	useEffect( () => {

		if ( tiles !== null && group !== null ) {

			group.updateMatrixWorld = function ( force ) {

				if ( this.matrixAutoUpdate ) {

					this.updateMatrix();

				}

				if ( this.matrixWorldNeedsUpdate || force ) {

					this.matrixWorld.multiplyMatrices( tiles.group.matrixWorld, this.matrix );
					force = true;

				}

				const children = this.children;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					child.updateMatrixWorld( force );

				}

			};

			return () => {

				group.updateMatrixWorld = Object3D.prototype.updateMatrixWorld;

			};

		}

	}, [ tiles, group ] );

	useEffect( () => {

		updateCallback();

	}, [ updateCallback ] );

	// update the position when a tile set is loaded since it may modify the ellipsoid
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		tiles.addEventListener( 'load-tile-set', updateCallback );
		return () => {

			tiles.removeEventListener( 'load-tile-set', updateCallback );

		};

	}, [ tiles, updateCallback ] );

	return <group ref={ setGroup }>{ children }</group>;

}

// component for registering a plugin
export const TilesPlugin = forwardRef( function TilesPlugin( props, ref ) {

	const { plugin, args, children, ...options } = props;
	const tiles = useContext( TilesRendererContext );
	const [ instance, setInstance ] = useState( null );
	const [ , forceUpdate ] = useReducer( x => x + 1, 0 );

	useLayoutEffect( () => {

		if ( tiles === null ) {

			return;

		}

		let instance;
		if ( Array.isArray( args ) ) {

			instance = new plugin( ...args );

		} else {

			instance = new plugin( args );

		}

		setInstance( instance );

		return () => {

			setInstance( null );

		};

	}, [ plugin, tiles, useObjectDep( args ) ] ); // eslint-disable-line

	// assigns any provided options to the plugin
	useDeepOptions( instance, options );

	// register the plugin
	useLayoutEffect( () => {

		if ( instance === null ) {

			return;

		}

		// force the component to rerender after registering the plugin because we don't
		// include the children until the plugin is added.
		tiles.registerPlugin( instance );
		forceUpdate();

		return () => {

			tiles.unregisterPlugin( instance );

		};

		// "tiles" is excluded from the dependencies since this would otherwise run once with the
		// new tiles renderer, resulting in an error when the instance is added to a second renderer.

	}, [ instance ] ); // eslint-disable-line

	// assign ref
	useApplyRefs( instance, ref );

	// only render out the plugin once the instance and context are ready and registered
	if ( ! instance || ! tiles.plugins.includes( instance ) ) {

		return;

	}

	return <TilesPluginContext.Provider value={ instance }>{ children }</TilesPluginContext.Provider>;

} );

// component for adding a TilesRenderer to the scene
export const TilesRenderer = forwardRef( function TilesRenderer( props, ref ) {

	const { url, group = {}, enabled = true, children, ...options } = props;
	const [ camera, gl, invalidate ] = useThree( state => [ state.camera, state.gl, state.invalidate ] );
	const [ tiles, setTiles ] = useState( null );

	// create the tile set
	useEffect( () => {

		const needsRender = () => invalidate();

		const tiles = new TilesRendererImpl( url );
		tiles.addEventListener( 'needs-render', needsRender );
		tiles.addEventListener( 'needs-update', needsRender );
		setTiles( tiles );

		return () => {

			tiles.removeEventListener( 'needs-render', needsRender );
			tiles.removeEventListener( 'needs-update', needsRender );
			tiles.dispose();
			setTiles( null );

		};

	}, [ url, invalidate ] );

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
	useLayoutEffect( () => {

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

	// only render out the tiles once the instance and context are ready
	if ( ! tiles ) {

		return null;

	}

	return <>
		<primitive object={ tiles.group } { ...group } />
		<TilesRendererContext.Provider value={ tiles }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

} );
