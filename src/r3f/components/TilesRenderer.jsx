import { createContext, useContext, useEffect, useRef, forwardRef, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import { TilesRenderer as TilesRendererImpl } from '../../three/renderer/tiles/TilesRenderer.js';
import { useDeepOptions } from '../utilities/useOptions.js';
import { useObjectDep } from '../utilities/useObjectDep.js';
import { useApplyRefs } from '../utilities/useApplyRefs.js';
import { WGS84_ELLIPSOID } from '../../three/renderer/math/GeoConstants.js';

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

	const instanceToUnregister = useRef( null );

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
	useDeepOptions( instance, options );

	// assign ref
	useApplyRefs( instance, ref );


	// register the instance
	useLayoutEffect( ()=>{

		if ( ! tiles ) {

			return

		}

		// Check if we have to register the plugin
		if ( ! tiles.plugins.includes( instance ) ) {
			// we do, it means either tiles or the plugin instance is new

			// check if this instance of TilesPlugin already have registered a plugin before
			if ( instanceToUnregister.current !== null ) {

				// we did register the plugin previously, check if tiles changed
				if ( instanceToUnregister.current[ 0 ] !== tiles ) {

					// if tiles changed, the plugin has already been unregistered from the previous instance and recreated in our useMemo
					// we can just register it again
					tiles.registerPlugin( instance );
					instanceToUnregister.current = [ tiles, instance ];

				} else {

					// tiles did not change, it's a new instance of the plugin
					// unregister the previous one first and then register this one
					tiles.unregisterPlugin( instanceToUnregister.current[ 1 ] );
					tiles.registerPlugin( instance );
					instanceToUnregister.current = [ tiles, instance ];

				}

			} else {

				// if tiles didn't change, we can just register the plugin
				tiles.registerPlugin( instance );
				instanceToUnregister.current = [ tiles, instance ];

			}

		}

	}, [ tiles, instance ] );

	return <TilesPluginContext.Provider value={ instance }>{ children }</TilesPluginContext.Provider>;

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

		const needsRender = () => invalidate();
		tiles.addEventListener( 'needs-render', needsRender );
		tiles.addEventListener( 'needs-update', needsRender );
		return () => {

			tiles.removeEventListener( 'needs-render', needsRender );
			tiles.removeEventListener( 'needs-update', needsRender );

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
		{/* react StrictMode compatible hack to only trigger dispose on the previous tiles instance if a new instance have been created
			or if the entire components has been unmounted
			it works because r3f call the function dispose only when the arguments change or when the component is unmounted
		*/}
		<group args={ [ tiles ] } dispose={ tiles ? () => tiles.dispose() : undefined } />
		<primitive object={ tiles.group } { ...group } />
		<TilesRendererContext.Provider value={ tiles }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

} );
