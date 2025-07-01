import { useContext, useState, useEffect, useMemo } from 'react';
import { TilesRendererContext } from './TilesRenderer.jsx';
import { CanvasDOMOverlay } from './CanvasDOMOverlay.jsx';

function randomUUID() {

	if ( window.crypto.randomUUID ) {

		return window.crypto.randomUUID();

	}

	// https://stackoverflow.com/a/2117523
	return '10000000-1000-4000-8000-100000000000'.replace(
		/[018]/g,
		c => ( + c ^ crypto.getRandomValues( new Uint8Array( 1 ) )[ 0 ] & 15 >> + c / 4 ).toString( 16 )
	);

}

// Overlay for displaying tile data set attributions
export function TilesAttributionOverlay( { children, style, generateAttributions, ...rest } ) {

	const tiles = useContext( TilesRendererContext );
	const [ attributions, setAttributions ] = useState( [] );

	// Add events for checking when attributions may be updated
	useEffect( () => {

		if ( ! tiles ) {

			return;

		}

		let queued = false;
		const callback = () => {

			if ( ! queued ) {

				queued = true;
				queueMicrotask( () => {

					setAttributions( tiles.getAttributions() );
					queued = false;

				} );

			}

		};

		tiles.addEventListener( 'tile-visibility-change', callback );
		tiles.addEventListener( 'load-tile-set', callback );

		return () => {

			tiles.removeEventListener( 'tile-visibility-change', callback );
			tiles.removeEventListener( 'load-tile-set', callback );

		};

	}, [ tiles ] );

	// Generate CSS for modifying child elements implicit to the html attributions
	const classId = useMemo( () => 'class_' + randomUUID(), [] );
	const styles = useMemo( () => `
		#${ classId } a {
			color: white;
		}

		#${ classId } img {
			max-width: 125px;
			display: block;
			margin: 5px 0;
		}
	`, [ classId ] );

	let output;
	if ( generateAttributions ) {

		output = generateAttributions( attributions, classId );

	} else {

		// generate elements for each type of attribution
		const elements = [];
		attributions.forEach( ( att, i ) => {

			let element = null;
			if ( att.type === 'string' ) {

				element = <div key={ i }>{ att.value }</div>;

			} else if ( att.type === 'html' ) {

				element = <div key={ i } dangerouslySetInnerHTML={ { __html: att.value } } style={ { pointerEvents: 'all' } }/>;

			} else if ( att.type === 'image' ) {

				element = <div key={ i }><img src={ att.value } /></div>;

			}

			if ( element ) {

				elements.push( element );

			}

		} );

		output = (
			<>
				<style>{ styles }</style>
				{ elements }
			</>
		);

	}

	return (
		<CanvasDOMOverlay
			id={ classId }
			style={ {
				position: 'absolute',
				bottom: 0,
				left: 0,
				padding: '10px',
				color: 'rgba( 255, 255, 255, 0.75 )',
				fontSize: '10px',
				...style,
			} }
			{ ...rest }
		>
			{ children }
			{ output }
		</CanvasDOMOverlay>
	);

}
