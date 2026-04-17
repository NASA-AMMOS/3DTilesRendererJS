import { forwardRef, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TilesPlugin, TilesPluginContext, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { TileFlatteningPlugin as TileFlatteningPluginImpl } from '3d-tiles-renderer/plugins';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

// NOTE: The flattening shape will not automatically update when child geometry vertices are adjusted so in order
// to force a remount of the component the use should modify a "key" property when it needs to change.

// construct a hash relative to a frame
const _matrix = /* @__PURE__ */ new Matrix4();
function objectHash( obj, relativeMatrix ) {

	let hash = '';
	obj.traverse( c => {

		let mat = c.matrix;
		if ( c === obj ) {

			_matrix.copy( obj.matrixWorld ).premultiply( relativeMatrix );
			mat = _matrix;

		}

		if ( c.geometry ) {

			hash += c.geometry.uuid + '_';

		}

		mat.elements.forEach( v => {

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
		// relative to the tileset ellipsoid if "direction" is not present
		relativeToEllipsoid = false,
	} = props;

	const [ group, setGroup ] = useState( null );
	const [ hash, setHash ] = useState( null );

	const relativeGroup = useMemo( () => {

		return new Group();

	}, [] );

	const updateShape = useCallback( () => {

		plugin.deleteShape( relativeGroup );

		relativeGroup.clear();
		relativeGroup.add( ...group.children.map( c => c.clone() ) );

		// ensure world transforms are up to date
		tiles.group.updateMatrixWorld();
		group.updateMatrixWorld( true );

		relativeGroup
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
			box.setFromObject( relativeGroup );
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

		setHash( objectHash( group, tiles.group.matrixWorldInverse ) );

	}, [ tiles, group, direction, relativeToEllipsoid, plugin, threshold, thresholdMode, flattenRange, relativeGroup ] );

	// Add the provided shape to the tileset
	useEffect( () => {

		if ( tiles === null || group === null || plugin === null ) {

			return;

		}

		updateShape();

		return () => {

			plugin.deleteShape( relativeGroup );

		};

	}, [ group, plugin, relativeGroup, tiles, updateShape ] );

	useFrame( () => {

		if ( ! tiles || ! group ) {

			return;

		}

		// check if the object needs to updated
		const newHash = objectHash( group, tiles.group.matrixWorldInverse );
		if ( hash !== newHash ) {

			updateShape();

		}

	} );

	return <group ref={ setGroup } visible={ visible } raycast={ () => false }>{ children }</group>;

}

// Wrapper for TilesFlatteningPlugin
export const TileFlatteningPlugin = forwardRef( function TileFlatteningPlugin( props, ref ) {

	const { children, ...rest } = props;

	return <TilesPlugin plugin={ TileFlatteningPluginImpl } ref={ ref } { ...rest }>{ children }</TilesPlugin>;

} );
