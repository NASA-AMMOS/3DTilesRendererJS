import { CanvasDOMOverlay, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { useThree } from '@react-three/fiber';
import { useContext, useEffect, useState } from 'react';
import { Vector3, MathUtils } from 'three';

const _v0 = /* @__PURE__ */new Vector3();
const _v1 = /* @__PURE__ */new Vector3();
function calculatePixelWidth( camera, resolution, distance ) {

	// calculate two projected points at the given distance into NDC
	const X_DELTA = 0.01;
	const v0 = _v0.set( 0, 0, - distance ).applyMatrix4( camera.projectionMatrix );
	const v1 = _v1.set( X_DELTA, 0, - distance ).applyMatrix4( camera.projectionMatrix );

	// calculate how many pixels per meter
	const pixelsPerMeter = ( Math.abs( v0.x - v1.x ) * resolution.width * 0.5 ) / X_DELTA;
	return 1 / pixelsPerMeter;

}

// format a number to be human readable with units
function formatNumber( v ) {

	if ( v === null ) {

		return '--';

	}

	const info = getDisplayValue( v );
	const display = parseFloat( info.value.toFixed( 2 ) ).toString().replace( /^-/, '- ' );
	return `${ display }${ info.unit }`;

}

// returns a unit and adjusted value for display
function getDisplayValue( value ) {

	const pow = Math.ceil( Math.log10( Math.abs( value ) ) );
	let unit = 'm';
	let exp = 0;

	switch ( MathUtils.clamp( pow, - 6, 2 ) ) {

		case 2:
			unit = 'km';
			exp = 3;
			break;
		case 1: case 0: case - 1:
			unit = 'm';
			exp = 0;
			break;
		case - 2:
			unit = 'cm';
			exp = - 2;
			break;
		case - 3: case - 4: case - 5:
			unit = 'mm';
			exp = - 3;
			break;
		case - 6:
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

export function TopoLineScaleWidget( { invert } ) {

	const get = useThree( ( { get } ) => get );
	const gl = useThree( ( { gl } ) => gl );
	const pointer = useThree( ( { pointer } ) => pointer );
	const [ info, setInfo ] = useState( null );
	const tiles = useContext( TilesRendererContext );
	const element = gl.domElement;

	// add callback for mouse movement
	useEffect( () => {

		const callback = () => {

			// get the topo plugin
			const plugin = tiles && tiles.getPluginByName( 'TOPO_LINES_PLUGIN' );
			if ( plugin ) {

				const { pointer, camera, scene, raycaster } = get();

				// get the hovered point
				raycaster.setFromCamera( pointer, camera );
				const hit = raycaster.intersectObject( scene )[ 0 ];

				if ( hit ) {

					// retrieve the topo line & elevation info
					const elevation = plugin.computeTopographicLineInfo( camera, hit.point );
					const length = { metersPerPixel: calculatePixelWidth( camera, plugin.resolution, hit.distance ) };

					if ( invert ) {

						elevation.value *= - 1;

					}

					setInfo( {
						elevation,
						length,
					} );

				} else {

					setInfo( null );

				}

			}

		};

		element.addEventListener( 'pointermove', callback );
		element.addEventListener( 'wheel', callback );

		return () => {

			element.removeEventListener( 'pointermove', callback );
			element.removeEventListener( 'wheel', callback );

		};

	}, [ get, element, tiles, invert ] );

	// extract the needed values
	let elevationValue = null;
	let stepInPixels = 5;
	let stepInMeters = null;
	let finalWidth = 0;
	let adjustedMeters = null;
	if ( info ) {

		// pixels are specified in drawing buffer size while css units account for dpr
		const dpr = window.devicePixelRatio;

		// elevation info
		const stepInfo = info.elevation.alpha < 0.25 ? info.elevation.max : info.elevation.min;
		elevationValue = info.elevation.value;
		stepInPixels = stepInfo.stepInPixels / dpr;
		stepInMeters = stepInfo.step;

		// length info
		const MAX_PIXEL_WIDTH = 50;
		const metersPerPixel = info.length.metersPerPixel * dpr;
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

	// construct the ticks for the topo lines
	const tickElement = <div style={ {
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

	// construct the element for displaying the tick measurements
	const tickMeasureElement = <div style={ {
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
		{ tickElement }
	</div>;

	// construct the element for pixel width display
	const widthMeasureElement = <div style= { {
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

	// construct the elevation display element
	const elevationElement = <div style={ {
		display: 'flex',
		marginTop: '10px',
	} }>
		<div style={ {
			flexGrow: 1,
		} }>{ formatNumber( elevationValue ) }</div>
		<div>el</div>
	</div>;

	const mouseEl = <div style={ {
		position: 'absolute',
		left: `${ ( pointer.x * 0.5 + 0.5 ) * 100 }%`,
		top: `${ 100 - ( pointer.y * 0.5 + 0.5 ) * 100 }%`,
		color: 'white',
		fontSize: '12px',
		pointerEvents: 'none',
		textShadow: '0px 0px 4px rgba( 0, 0, 0, 0.5 )',
	} }>
		<div style={ {
			transform: 'translateX( -50% ) translateY( -125% )'
		} }>{ elevationValue ? formatNumber( elevationValue ) : '' }</div>
	</div>;

	return <CanvasDOMOverlay>
		{ mouseEl }

		<div style={ {
			padding: '5px',
			width: '65px',
			height: '80px',
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

			{ tickMeasureElement }

			{ elevationElement }

			{ widthMeasureElement }
		</div>
	</CanvasDOMOverlay>;

}
