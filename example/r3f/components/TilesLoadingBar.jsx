import { CanvasDOMOverlay, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { useFrame } from '@react-three/fiber';
import { useContext, useRef } from 'react';

export function TilesLoadingBar( props ) {

	const tiles = useContext( TilesRendererContext );
	const domRef = useRef();

	useFrame( () => {

		const element = domRef.current;
		if ( element && tiles ) {

			element.style.width = `${ tiles.loadProgress * 100 }%`;
			element.style.opacity = tiles.loadProgress === 1 ? 0 : 1;
			element.style.transition = tiles.loadProgress === 1 ? 'opacity 0.5s linear' : '';

		}

	} );

	return <CanvasDOMOverlay
		ref={ domRef }
		style={ {
			position: 'absolute',
			left: 0,
			bottom: 0,
			height: '2px',
			background: 'white',
			// transition: 'opacity 0.2s linear',
			opacity: 0,
			width: '100%',
		} }
	/>;

}
