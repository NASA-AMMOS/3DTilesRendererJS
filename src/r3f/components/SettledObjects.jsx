import { cloneElement, createContext, forwardRef, useContext, useEffect, useMemo, useRef } from 'react';
import { useMultipleRefs } from '../utilities/useMultipleRefs.js';
import { TilesRendererContext } from './TilesRenderer.jsx';
import { QueryManager } from '../utilities/QueryManager.js';
import { useDeepOptions } from '../utilities/useOptions.jsx';
import { OBJECT_FRAME } from '../../three/math/Ellipsoid.js';
import { Matrix4, Ray } from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const QueryManagerContext = createContext( null );

export const SettledObject = forwardRef( function SettledObject( props, ref ) {

	const {
		component = <group />,
		lat = null,
		lon = null,
		rayorigin = null,
		raydirection = null,
		...rest
	} = props;

	const objectRef = useRef( null );
	const tiles = useContext( TilesRendererContext );
	const queries = useContext( QueryManagerContext );
	const invalidate = useThree( ( { invalidate } ) => invalidate );

	useEffect( () => {

		if ( lat !== null && lon !== null ) {

			const matrix = new Matrix4();
			const index = queries.registerLatLonQuery( lat, lon, hit => {

				if ( hit !== null && objectRef.current !== null ) {

					objectRef.current.position.copy( hit.point );
					queries.ellipsoid.getRotationMatrixFromAzElRoll( lat, lon, 0, 0, 0, matrix, OBJECT_FRAME ).premultiply( tiles.group.matrixWorld );
					objectRef.current.quaternion.setFromRotationMatrix( matrix );
					invalidate();

				}

			} );

			return () => queries.unregisterQuery( index );

		} else if ( rayorigin !== null && raydirection !== null ) {

			const ray = new Ray();
			ray.origin.copy( rayorigin );
			ray.direction.copy( raydirection );
			const index = queries.registerRayQuery( ray, hit => {

				if ( hit !== null && objectRef.current !== null ) {

					objectRef.current.position.copy( hit.point );
					objectRef.current.quaternion.identity();
					invalidate();

				}

			} );

			return () => queries.unregisterQuery( index );

		}

	}, [ lat, lon, rayorigin, raydirection, queries, tiles, invalidate ] );

	return cloneElement( component, { ...rest, ref: useMultipleRefs( objectRef, ref ), raycast: () => false } );

} );

export const SettledObjects = forwardRef( function SettledObjects( props, ref ) {

	const threeScene = useThree( ( { scene } ) => scene );
	const {
		scene = threeScene,
		children,
		...rest
	} = props;

	const tiles = useContext( TilesRendererContext );
	const queries = useMemo( () => new QueryManager(), [] );
	const camera = useThree( ( { camera } ) => camera );

	useDeepOptions( queries, rest );

	useEffect( () => {

		queries.setScene( ...( Array.isArray( scene ) ? scene : [ scene ] ) );

	}, [ queries, scene ] );

	useEffect( () => {

		queries.addCamera( camera );

	}, [ queries, camera ] );

	useFrame( () => {

		if ( tiles ) {

			queries.setEllipsoidFromTilesRenderer( tiles );

		}

	} );

	useMultipleRefs( ref )( queries );

	return (
		<QueryManagerContext.Provider value={ queries }>
			{ children }
		</QueryManagerContext.Provider>
	);

} );
