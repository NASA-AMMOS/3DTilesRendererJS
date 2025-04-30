import { CanvasDOMOverlay, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useState } from 'react';

function getDisplayValue( value ) {

	const pow = Math.ceil( Math.log10( Math.abs( value ) ) );
	let unit = 'm';
	let exp = 0;

	switch ( pow ) {

		case 5: case 4: case 3: case 2:
			unit = 'km';
			exp = 3;
			break;
		case 1: case 0:
			unit = 'm';
			exp = 0;
			break;
		case - 1: case - 2:
			unit = 'cm';
			exp = - 2;
			break;
		case - 3: case - 4: case - 5:
			unit = 'mm';
			exp = - 3;
			break;
		case - 6: case - 7: case - 8:
			unit = 'μM';
			exp = - 6;
			break;

		default:
			throw new Error();

	}

	return {
		unit,
		value: value * Math.pow( 10, - exp ),
	};

}

export function TopoLineScale() {

	const get = useThree( ( { get } ) => get );
	const [ info, setInfo ] = useState( null );
	const tiles = useContext( TilesRendererContext );
	useFrame( () => {

		const plugin = tiles && tiles.getPluginByName( 'TOPO_LINES_PLUGIN' );
		if ( plugin ) {

			const {
				pointer,
				camera,
				scene,
				raycaster,
			} = get();

			raycaster.setFromCamera( pointer, camera );

			const hit = raycaster.intersectObject( scene )[ 0 ];
			if ( hit ) {

				const info = plugin.computeTopographicLineInfo( camera, hit.point );
				setInfo( info );

			} else {

				setInfo( null );

			}

		}

	} );

	if ( info === null ) {

		return null;

	}

	const data = getDisplayValue( info.value );
	console.log( data )

	return <CanvasDOMOverlay>
		<div style={ {
			width: '100px',
			height: '200px',
			position: 'absolute',
			right: 10,
			bottom: 200,
			background: 'rgb( 0, 0, 0, 0.25 )',
			color: 'white'
		} }>
			{ info.min.step }m

			<br/>
			{ data.value.toFixed( 2 ) }{ data.unit }
		</div>
	</CanvasDOMOverlay>;

}
