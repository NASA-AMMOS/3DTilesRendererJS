import { CanvasDOMOverlay, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { useFrame, useThree } from '@react-three/fiber';
import { useContext, useState } from 'react';
import { Vector3 } from 'three';

function calculatePixelWidth( camera, resolution, distance ) {

	const WIDTH = 0.01;
	const v0 = new Vector3( 0, 0, - distance ).applyMatrix4( camera.projectionMatrix );
	const v1 = new Vector3( WIDTH, 0, - distance ).applyMatrix4( camera.projectionMatrix );

	const pixelsPerMeter = ( Math.abs( v0.x - v1.x ) * resolution.width * 0.5 ) / WIDTH;
	return 1 / pixelsPerMeter;

}

function formatNumber( v ) {

	if ( v === null ) {

		return '--';

	}

	const info = getDisplayValue( v );
	const display = parseFloat( info.value.toFixed( 2 ) ).toString().replace( /^-/, '- ' );
	return `${ display }${ info.unit }`;

}

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

		// TODO: handle this more gracefully. Just fallback to the closest supported units if necessary?
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
				info.width = {
					metersPerPixel: calculatePixelWidth( camera, plugin.resolution, hit.distance ),
				};
				setInfo( info );

			} else {

				setInfo( null );

			}

		}

	}, - 100 );

	let elevationValue = null;
	let stepInPixels = 5;
	let stepInMeters = null;
	let metersPerPixel = null;
	if ( info ) {

		const stepInfo = info.alpha < 0.25 ? info.max : info.min;
		elevationValue = info.value;
		stepInPixels = stepInfo.stepInPixels;
		stepInMeters = stepInfo.step;
		metersPerPixel = info.width.metersPerPixel;

	}

	const ticks = <div style={ {
		flexGrow: 1,
		display: 'flex',
		flexDirection: 'column',
		overflow: 'hidden',
		alignItems: 'end',
		justifyContent: 'end',
		paddingBottom: '0.5em',
	} }>
		{
			new Array( 10 )
				.fill()
				.map( ( e, i ) => {

					return <div
						key={ i }
						style={ {
							minHeight: i === 9 ? '1px' : '1px',
							opacity: i === 9 ? 1 : 0.5,
							width: i === 9 ? '15px' : '10px',
							background: 'white',
							marginTop: stepInPixels,
						} }
					/>;

				} )
		}</div>;

	const tickMeasure = <div style={ {
		display: 'flex',
		overflow: 'hidden',
		flexGrow: 1,
	} }>
		<div style={ {
			display: 'flex',
			flexDirection: 'column',
			flexGrow: 1,
			justifyContent: 'end',
		} }>
			<div>{ formatNumber( stepInMeters ) }</div>
			<div>{ formatNumber( stepInMeters * 10.0 || null ) }</div>
		</div>
		{ ticks }
	</div>;

	let finalWidth = 0;
	let adjustedMeters = null;
	if ( metersPerPixel !== null ) {

		const MAX_PIXEL_WIDTH = 50;
		const targetMeters = MAX_PIXEL_WIDTH * metersPerPixel;
		adjustedMeters = 10 ** Math.floor( Math.log10( targetMeters ) );
		finalWidth = adjustedMeters / metersPerPixel;
		if ( finalWidth * 5 < MAX_PIXEL_WIDTH ) {

			adjustedMeters *= 5;
			finalWidth *= 5;

		}

		if ( finalWidth * 2.5 < MAX_PIXEL_WIDTH ) {

			adjustedMeters *= 2.5;
			finalWidth *= 2.5;

		}

	}

	const widthMeasure = <div style= { {
		marginTop: '10px',

	} }>
		<div style={ {
			display: 'flex',
		} }>
			<div style={ {
				flexGrow: 1,
			} }>{ formatNumber( adjustedMeters ) }</div>
			<div>len</div>
		</div>
		<div style={ {
			height: '2px',
			borderTop: '1px solid white',
			borderLeft: '1px solid white',
			borderRight: '1px solid white',
			width: finalWidth === 0 ? '100%' : `${ finalWidth }px`,
		} }></div>
	</div>;

	return <CanvasDOMOverlay>
		<div style={ {
			padding: '5px',
			width: '65px',
			height: '90px',
			position: 'absolute',
			left: 5,
			bottom: 5,
			background: 'rgb( 0, 0, 0, 0.2 )',
			borderRadius: 3,
			color: 'white',
			display: 'flex',
			flexDirection: 'column',
			fontSize: '12px',
		} }>

			{ tickMeasure }

			<div style={ {
				display: 'flex',
				marginTop: '10px',
			} }>
				<div style={ {
					flexGrow: 1,
				} }>{ formatNumber( elevationValue ) }</div>
				<div>el</div>
			</div>

			{ widthMeasure }
		</div>
	</CanvasDOMOverlay>;

}
