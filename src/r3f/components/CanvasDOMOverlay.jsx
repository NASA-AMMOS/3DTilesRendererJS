import { useMemo, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useThree } from '@react-three/fiber';

// Utility class for overlaying dom elements on top of the canvas
export function CanvasDOMOverlay( { children, ...rest } ) {

	// create the dom element and react root
	const [ gl ] = useThree( state => [ state.gl ] );
	const container = useMemo( () => document.createElement( 'div' ), [] );
	const root = useMemo( () => createRoot( container ), [ container ] );

	// watch for canvas resize
	const observer = useMemo( () => {

		const observer = new ResizeObserver( ( [ { contentRect } ] ) => {

			container.style.top = `${ contentRect.top }px`;
			container.style.left = `${ contentRect.left }px`;
			container.style.width = `${ contentRect.width }px`;
			container.style.height = `${ contentRect.height }px`;

		} );
		observer.observe( gl.domElement );
		return observer;

	}, [ gl, container ] );

	// position the container
	useEffect( () => {

		container.style.pointerEvents = 'none';
		container.style.position = 'absolute';
		document.body.appendChild( container );

		return () => {

			container.remove();
			observer.disconnect();

		};

	}, [ observer, container ] );

	// render the children into the container
	root.render(
		<StrictMode>
			<div { ...rest }>
				{ children }
			</div>
		</StrictMode>
	);

}
