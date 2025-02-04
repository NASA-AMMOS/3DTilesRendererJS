import { cloneElement, createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useMultipleRefs } from '../utilities/useMultipleRefs.js';
import { TilesRendererContext } from './TilesRenderer.jsx';
import { QueryManager } from '../utilities/QueryManager.js';
import { useDeepOptions } from '../utilities/useOptions.js';
import { OBJECT_FRAME } from '../../three/math/Ellipsoid.js';
import { Matrix4, Ray, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useApplyRefs } from '../utilities/useApplyRefs.js';

const QueryManagerContext = createContext( null );
const _matrix = /* @__PURE__ */ new Matrix4();
const _ray = /* @__PURE__ */ new Ray();

export const AnimatedSettledObject = forwardRef( function AnimatedSettledObject( props, ref ) {

	const {
		interpolationFactor = 0.025,
		onQueryUpdate = null,
		...rest
	} = props;

	const tiles = useContext( TilesRendererContext );
	const queries = useContext( QueryManagerContext );
	const invalidate = useThree( ( { invalidate } ) => invalidate );
	const target = useMemo( () => new Vector3(), [] );
	const isInitialized = useMemo( () => ( { value: false } ), [] );
	const isTargetSet = useMemo( () => ( { value: false } ), [] );
	const objectRef = useRef( null );

	const queryCallback = useCallback( hit => {

		if ( tiles === null || hit === null || objectRef.current === null ) {

			return;

		}

		const { lat, lon, rayorigin, raydirection } = rest;
		if ( lat !== null && lon !== null ) {

			target.copy( hit.point );
			isTargetSet.value = true;

			queries.ellipsoid.getRotationMatrixFromAzElRoll( lat, lon, 0, 0, 0, _matrix, OBJECT_FRAME ).premultiply( tiles.group.matrixWorld );
			objectRef.current.quaternion.setFromRotationMatrix( _matrix );
			invalidate();

		} else if ( rayorigin !== null && raydirection !== null ) {

			target.copy( hit.point );
			isTargetSet.value = true;

			objectRef.current.quaternion.identity();
			invalidate();

		}

		if ( onQueryUpdate ) {

			onQueryUpdate( hit );

		}

	}, [ invalidate, isTargetSet, queries.ellipsoid, rest, target, tiles, onQueryUpdate ] );

	// interpolate the point position
	useFrame( ( state, delta ) => {

		if ( objectRef.current ) {

			objectRef.current.visible = isInitialized.value;

		}

		if ( objectRef.current && isTargetSet.value ) {

			// jump the point to the target if it's being set for the first time
			if ( isInitialized.value === false ) {

				isInitialized.value = true;
				objectRef.current.position.copy( target );

			} else {

				// framerate independent lerp by Freya Holmer
				const factor = 1 - 2 ** ( - delta / interpolationFactor );
				if ( objectRef.current.position.distanceToSquared( target ) > 1e-6 ) {

					objectRef.current.position.lerp(
						target, interpolationFactor === 0 ? 1 : factor
					);

					invalidate();

				} else {

					objectRef.current.position.copy( target );

				}

			}

		}

	} );

	return (
		<SettledObject
			ref={ useMultipleRefs( objectRef, ref ) }
			onQueryUpdate={ queryCallback }
			{ ...rest }
		/>
	);

} );

// Object that updates its "settled" state
export const SettledObject = forwardRef( function SettledObject( props, ref ) {

	const {
		component = <group />,
		lat = null,
		lon = null,
		rayorigin = null,
		raydirection = null,
		onQueryUpdate = null,

		...rest
	} = props;

	const objectRef = useRef( null );
	const tiles = useContext( TilesRendererContext );
	const queries = useContext( QueryManagerContext );
	const invalidate = useThree( ( { invalidate } ) => invalidate );
	const target = useMemo( () => new Vector3(), [] );

	useEffect( () => {

		const callback = hit => {

			if ( onQueryUpdate ) {

				onQueryUpdate( hit );

			} else if ( tiles && hit !== null && objectRef.current !== null ) {

				if ( lat !== null && lon !== null ) {

					objectRef.current.position.copy( hit.point );
					queries.ellipsoid.getRotationMatrixFromAzElRoll( lat, lon, 0, 0, 0, _matrix, OBJECT_FRAME ).premultiply( tiles.group.matrixWorld );
					objectRef.current.quaternion.setFromRotationMatrix( _matrix );
					invalidate();

				} else if ( rayorigin !== null && raydirection !== null ) {

					objectRef.current.position.copy( hit.point );
					objectRef.current.quaternion.identity();
					invalidate();

				}

			}

		};

		if ( lat !== null && lon !== null ) {

			const index = queries.registerLatLonQuery( lat, lon, callback );
			return () => queries.unregisterQuery( index );

		} else if ( rayorigin !== null && raydirection !== null ) {

			_ray.origin.copy( rayorigin );
			_ray.direction.copy( raydirection );
			const index = queries.registerRayQuery( _ray, callback );
			return () => queries.unregisterQuery( index );

		}

	}, [ lat, lon, rayorigin, raydirection, queries, tiles, invalidate, target, onQueryUpdate ] );

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

		return () => queries.dispose();

	}, [ queries ] );

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

	// assign ref
	useApplyRefs( queries, ref );

	return (
		<QueryManagerContext.Provider value={ queries }>
			<group matrixAutoUpdate={ false } matrixWorldAutoUpdate={ false }>
				{ children }
			</group>
		</QueryManagerContext.Provider>
	);

} );
