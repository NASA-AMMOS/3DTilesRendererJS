import { useMemo, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import { useThree } from '@react-three/fiber';

export function CanvasDOMOverlay( { children, styles, ...rest } ) {

	const [ gl ] = useThree( state => [ state.gl ] );
	const container = useMemo( () => document.createElement( 'div' ), [] );
	const root = useMemo( () => createRoot( container ), [ container ] );

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

		container.style.pointerEvents = 'none';
		container.style.position = 'absolute';
		document.body.appendChild( container );

		return () => {

			container.remove();
			observer.disconnect();

		};

	}, [ observer, container ] );

	root.render(
		<StrictMode>
			<div style={ { pointerEvents: 'all', ...styles } } { ...rest }>
				{ children }
			</div>
		</StrictMode>
	);
}
