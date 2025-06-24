import { useFrame, useThree } from '@react-three/fiber';
import { ImageOverlayPlugin as ImageOverlayPluginImpl } from '3d-tiles-renderer/plugins';
import { TilesPlugin, TilesPluginContext, TilesRendererContext, useObjectDep, useApplyRefs } from '3d-tiles-renderer/r3f';
import { forwardRef, useContext, useEffect, useMemo } from 'react';

export function ImageOverlayPlugin( { children, ...rest } ) {

	const gl = useThree( state => state.gl );
	return (
		<TilesPlugin plugin={ ImageOverlayPluginImpl } args={ { renderer: gl, ...rest } }>
			{ children }
		</TilesPlugin>
	);

}

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
