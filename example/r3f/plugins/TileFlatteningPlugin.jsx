import { forwardRef, useContext, useEffect, useMemo, useState } from 'react';
import { TilesPlugin, TilesPluginContext, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { TileFlatteningPlugin as TileFlatteningPluginImpl } from '../../src/three/TileFlatteningPlugin.js';
import { Box3, Group, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

// NOTE: The flattening shape will not automatically update when child geometry vertices are adjusted so in order
// to force a remount of the component the use should modify a "key" property when it needs to change.

// construct a hash relative to a frame
function objectHash( obj ) {

	let hash = '';
	obj.traverse( c => {

		if ( c === obj ) {

			return;

		}

		if ( c.geometry ) {

			hash += c.geometry.uuid + '_';

		}

		c.matrix.elements.forEach( v => {

			hash += v.toFixed( 6 ) + ',';

		} );


	} );

	return hash;

}

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
		thresholdMode = 'none',
		flattenRange = 0,

		// the "direction" option for "addShape"
		direction = null,

		// if true then a projection direction is derived from the shape position
		// relative to the tile set ellipsoid if "direction" is not present
		relativeToEllipsoid = false,
	} = props;

	const [ group, setGroup ] = useState( null );
	const [ hash, setHash ] = useState( null );

	const relativeGroup = useMemo( () => {

		return new Group();

	}, [] );

	// Add the provided shape to the tile set
	useEffect( () => {

		if ( tiles === null || group === null || plugin === null ) {

			return;

		}

		// ensure world transforms are up to date
		tiles.group.updateMatrixWorld();
		group.updateMatrixWorld( true );

		const local = group.clone();
		local
			.matrixWorld
			.copy( group.matrixWorld )
			.premultiply( tiles.group.matrixWorldInverse )
			.decompose( relativeGroup.position, relativeGroup.quaternion, relativeGroup.scale );

		// Calculate the direction to flatten on
		const _direction = new Vector3();
		if ( direction ) {

			_direction.copy( direction );

		} else if ( relativeToEllipsoid ) {

			const box = new Box3();
			box.setFromObject( local );
			box.getCenter( _direction );
			tiles.ellipsoid.getPositionToNormal( _direction, _direction ).multiplyScalar( - 1 );

		} else {

			_direction.set( 0, 0, 1 );

		}

		// add a shape to the plugin
		plugin.addShape( relativeGroup, _direction, {
			threshold,
			thresholdMode,
			flattenRange,
		} );
		setHash( null );

		return () => {

			plugin.deleteShape( relativeGroup );

		};

	}, [ group, tiles, plugin, direction, relativeToEllipsoid, threshold, thresholdMode, flattenRange, relativeGroup ] );

	// detect if the object transform or geometry has changed
	useFrame( () => {

		if ( ! tiles || ! group ) {

			return;

		}

		// check if the object needs to updated
		const newHash = objectHash( group, tiles.group.matrixWorldInverse );
		if ( hash !== newHash ) {

			tiles.group.updateMatrixWorld( true );
			group.updateMatrixWorld( true );

			relativeGroup.clear();
			relativeGroup.add( ...group.children.map( c => c.clone() ) );
			relativeGroup
				.matrixWorld
				.copy( group.matrixWorld )
				.premultiply( tiles.group.matrixWorldInverse )
				.decompose( relativeGroup.position, relativeGroup.quaternion, relativeGroup.scale );

			plugin.updateShape( relativeGroup );
			setHash( newHash );

		}

	} );

	return <group ref={ setGroup } visible={ visible } raycast={ () => false }>{ children }</group>;

}

// Wrapper for TilesFlatteningPlugin
export const TileFlatteningPlugin = forwardRef( function TileFlatteningPlugin( props, ref ) {

	const { children, ...rest } = props;

	return <TilesPlugin plugin={ TileFlatteningPluginImpl } ref={ ref } { ...rest }>{ children }</TilesPlugin>;

} );
