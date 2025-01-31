import { createContext, forwardRef, useContext, useEffect, useMemo, useRef } from 'react';
import { useMultipleRefs } from '../utilities/useMultipleRefs.js';
import { TilesRendererContext } from './TilesRenderer.js';
import { QueryManager } from '../utilities/QueryManager.js';
import { useDeepOptions } from '../utilities/useOptions.js';

const QueryManagerContext = createContext( null );

export const SettledObject = forwardRef( function SettledObject( props, ref ) {

	const {
		component = group,
		duration = 0,
		easeFunction = x => x,
		lat = null,
		lon = null,
		rayorigin = null,
		raydirection = null,
		...rest
	} = props;

	const objectRef = useRef( null );
	const queries = useContext( QueryManagerContext );
	useEffect( () => {

		if ( lat !== null && lon !== null ) {

			const index = queries.registerLatLonQuery( lat, lon, () => {

			} );

			return () => queries.unregisterQuery( index );

		} else if ( rayorigin !== null && raydirection !== null ) {

			const ray = new Ray();
			ray.origin.copy( rayorigin );
			ray.direction.copy( raydirection );
			const index = queries.registerLatLonQuery( lat, lon, () => {

			} );

			return () => queries.unregisterQuery( index );

		}

	}, [ lat, lon, rayorigin, raydirection, queries ] );

	return <component { ...rest } ref={ useMultipleRefs( objectRef, ref ) } />;

} );

export const SettledObjects = forwardRef( function SettledObjects( props, ref ) {

	const {
		scene,
		children,
		...rest
	} = props;

	const tiles = useContext( TilesRendererContext );
	const queries = useMemo( () => new QueryManager(), [] );

	useDeepOptions( queries, rest );

	useEffect( () => {

		queries.setScene( ...scene );

	}, [ queries, scene ] );

	useEffect( () => {

		if ( tiles ) {

			// TODO: we need to react to matrix update
			queries.ellipsoid.copy( tiles.ellipsoid );
			queries.frame.copy( tiles.group.matrixWorld );

		}

	}, [ queries, tiles ] );

	useMultipleRefs( ref )( queries );

	return (
		<QueryManagerContext.Provider value={ queries }>
			{ children }
		</QueryManagerContext.Provider>
	);

} );
