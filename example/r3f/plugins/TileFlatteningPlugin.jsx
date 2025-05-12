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

		// if true then the child geometry is rendered
		visible = false,

		// the "threshold" option for "addShape"
		threshold = Infinity,

		// the "direction" option for "addShape"
		direction = null,

		// if true then a projection direction is derived from the shape position
		// relative to the tile set ellipsoid if "direction" is not present
		relativeToEllipsoid = false,
	} = props;

	const [ group, setGroup ] = useState( null );

	// Add the provided shape to the tile set
	useEffect( () => {

		if ( tiles === null || group === null || plugin === null ) {

			return;

		}

		// ensure world transforms are up to date
		tiles.group.updateMatrixWorld();
		group.updateMatrixWorld( true );

		// transform the shape into the local frame of the tile set
		const relativeGroup = group.clone();
		relativeGroup
			.matrixWorld
			.premultiply( tiles.group.matrixWorldInverse )
			.decompose( relativeGroup.position, relativeGroup.quaternion, relativeGroup.scale );

		// Calculate the direction to flatten on
		const _direction = new Vector3();
		if ( direction ) {

			_direction.copy( direction );

		} else if ( relativeToEllipsoid ) {

			const box = new Box3();
			box.setFromObject( relativeGroup );
			box.getCenter( _direction );
			tiles.ellipsoid.getPositionToNormal( _direction, _direction ).multiplyScalar( - 1 );

		} else {

			_direction.set( 0, 0, 1 );

		}

		// add a shape to the plugin
		plugin.addShape( relativeGroup, _direction, threshold );

		return () => {

			plugin.deleteShape( relativeGroup );

		};

	}, [ group, tiles, plugin, direction, relativeToEllipsoid, threshold ] );

	return <group ref={ setGroup } visible={ visible } raycast={ () => false }>{ children }</group>;

}

// Wrapper for TilesFlatteningPlugin
export const TileFlatteningPlugin = forwardRef( function TileFlatteningPlugin( props, ref ) {

	const { children, ...rest } = props;

	return <TilesPlugin plugin={ TilesFlatteningPluginImpl } ref={ ref } { ...rest }>{ children }</TilesPlugin>;

} );
