import { useMemo, useEffect, createRoot } from 'react';
import { useThree } from '@react-three/fiber';

export function CanvasDOMOverlay( { children } ) {

	const [ gl ] = useThree( state => state.gl );
	const container = useMemo( () => {

		const container = document.createElement( 'div' );
		container.style.pointerEvents = 'none';

	} );

	const root = useMemo( () => {

		return createRoot( container );

	} );

	const observer = useMemo( () => {

		const observer = new ResizeObserver( ( [ { contentRect } ] ) => {

			container.style.top = `${ contentRect.top }px`;
			container.style.left = `${ contentRect.left }px`;
			container.style.width = `${ contentRect.width }px`;
			container.style.height = `${ contentRect.height }px`;

		} );
		observer.observe( gl.domElement );

	}, [ gl ] );

	useEffect( () => {

		return () => {

			observer.disconnect();

		};

	}, [ observer ] );

	root.render( <StrictMode>{ children }</StrictMode> );

}
