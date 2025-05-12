import { forwardRef, useContext, useEffect, useState } from 'react';
import { TilesPlugin, TilesPluginContext, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { TileFlatteningPlugin as TilesFlatteningPluginImpl } from '3d-tiles-renderer/plugins';
import { Box3, Vector3 } from 'three';

// Helper class for adding a flattening shape to the scene
export function TileFlatteningShape( props ) {

	// Get the plugins and tiles
	const plugin = useContext( TilesPluginContext );
	const tiles = useContext( TilesRendererContext );

	const {
		children,
		debug = false,
		relativeToEllipsoid = false,
		threshold = Infinity,
		direction = null,
	} = props;

	const [ group, setGroup ] = useState( null );

	// Add the provided shape to the tile set
	useEffect( () => {

		if ( tiles === null || group === null || plugin === null ) {

			return;

		}

		// Calculate the direction to flatten on
		const _direction = new Vector3();
		if ( direction ) {

			_direction.copy( direction );

		} else if ( relativeToEllipsoid ) {

			const box = new Box3();
			box.setFromObject( group );
			box.getCenter( _direction );
			tiles.ellipsoid.getPositionToNormal( _direction, _direction ).multiplyScalar( - 1 );

		} else {

			_direction.set( 0, 0, 1 );

		}

		group.updateMatrixWorld( true );

		// transform the shape into the local frame of the tile set
		const relativeGroup = group.clone();
		relativeGroup
			.matrixWorld
			.premultiply( tiles.group.matrixWorldInverse )
			.decompose( relativeGroup.position, relativeGroup.quaternion, relativeGroup.scale );

		// add a shape to the plugin
		plugin.addShape( relativeGroup, _direction, threshold );

		return () => {

			plugin.deleteShape( relativeGroup );

		};

	}, [ group, tiles, plugin, direction, relativeToEllipsoid, threshold ] );

	return <group ref={ setGroup } visible={ debug } raycast={ () => false }>{ children }</group>;

}

// Wrapper for TilesFlatteningPlugin
export const TileFlatteningPlugin = forwardRef( function TileFlatteningPlugin( props, ref ) {

	const { children, ...rest } = props;

	return <TilesPlugin plugin={ TilesFlatteningPluginImpl } ref={ ref } { ...rest }>{ children }</TilesPlugin>;

} );
