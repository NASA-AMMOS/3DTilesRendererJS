import { useContext, useState, useEffect, useMemo } from 'react';
import { TilesRendererContext } from './TilesRenderer.jsx';
import { CanvasDOMOverlay } from './CanvasDOMOverlay.jsx';

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
	const classId = useMemo( () => 'class_' + window.crypto.randomUUID(), [] );
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
