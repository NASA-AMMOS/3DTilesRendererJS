import { useFrame, useThree } from '@react-three/fiber';
import { ImageOverlayPlugin as ImageOverlayPluginImpl } from '3d-tiles-renderer/plugins';
import { TilesPlugin, TilesPluginContext, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { forwardRef, useContext, useEffect, useMemo, useRef } from 'react';

export const ImageOverlayPlugin = forwardRef( function ImageOverlayPlugin( { children, ...rest }, ref ) {

	const gl = useThree( state => state.gl );
	return (
		<TilesPlugin plugin={ ImageOverlayPluginImpl } args={ { renderer: gl, ...rest } } ref={ ref }>
			{ children }
		</TilesPlugin>
	);

} );

export const ImageOverlay = forwardRef( function ImageOverlay( props, ref ) {

	const {
		type,
		order = null,
		opacity = 1,
		color = 0xffffff,
		worldFrame = null,
		...rest
	} = props;

	const plugin = useContext( TilesPluginContext );
	const tiles = useContext( TilesRendererContext );
	const overlay = useMemo( () => {

		return new type( rest );

	}, [ type, useObjectDep( rest ) ] ); // eslint-disable-line

	useEffect( () => {

		plugin.addOverlay( overlay, order );

		return () => {

			plugin.deleteOverlay( overlay );

		};

	}, [ overlay, plugin ] ); // eslint-disable-line

	useEffect( () => {

		plugin.setOverlayOrder( overlay, order );

	}, [ overlay, plugin, order ] );

	useEffect( () => {

		overlay.opacity = opacity;
		overlay.color.set( color );
		if ( worldFrame && ! overlay.frame ) {

			overlay.frame = worldFrame.clone();

		} else if ( ! worldFrame && overlay.frame ) {

			overlay.frame = null;

		}

	}, [ overlay, opacity, color, worldFrame ] );

	useFrame( () => {

		if ( worldFrame && tiles ) {

			overlay.frame.copy( worldFrame ).premultiply( tiles.group.matrixWorldInverse );

		}

	} );

	useApplyRefs( overlay, ref );

} );

function useApplyRefs( target, ...refs ) {

	useEffect( () => {

		refs.forEach( ref => {

			if ( ref ) {

				if ( ref instanceof Function ) {

					ref( target );

				} else {

					ref.current = target;

				}

			}

		} );

	}, [ target, ...refs ] ); // eslint-disable-line

}

// checks if the first level of object key-values are equal
function areObjectsEqual( a, b ) {

	// early check for equivalence
	if ( a === b ) {

		return true;

	}

	// if either of the objects is null or undefined, then perform a simple check
	if ( ! a || ! b ) {

		return a === b;

	}

	// check all keys and values in the first object
	for ( const key in a ) {

		if ( a[ key ] !== b[ key ] ) {

			return false;

		}

	}

	// check all keys and values in the second object
	for ( const key in b ) {

		if ( a[ key ] !== b[ key ] ) {

			return false;

		}

	}

	return true;

}

// Helper for using an object as a dependency in a useEffect or useMemo array
function useObjectDep( object ) {

	// only modify the returned object reference if it has changed
	const ref = useRef();
	if ( ! areObjectsEqual( ref.current, object ) ) {

		ref.current = object;

	}

	return ref.current;

}
