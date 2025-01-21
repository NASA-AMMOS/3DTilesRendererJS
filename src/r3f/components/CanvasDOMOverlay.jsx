import { useMemo, useEffect, StrictMode, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useThree } from '@react-three/fiber';

// Utility class for overlaying dom elements on top of the canvas
export const CanvasDOMOverlay = forwardRef( function CanvasDOMOverlay( { children, ...rest }, ref ) {

	// create the dom element and react root
	const [ gl ] = useThree( state => [ state.gl ] );
	const container = useMemo( () => document.createElement( 'div' ), [] );
	const root = useMemo( () => createRoot( container ), [ container ] );

	// position the container
	useEffect( () => {

		container.style.pointerEvents = 'none';
		container.style.position = 'absolute';
		container.style.width = '100%';
		container.style.height = '100%';
		container.style.left = 0;
		container.style.top = 0;
		gl.domElement.parentNode.appendChild( container );

		return () => {

			container.remove();

		};

	}, [ container, gl.domElement.parentNode ] );

	// render the children into the container
	root.render(
		<StrictMode>
			<div { ...rest } ref={ ref }>
				{ children }
			</div>
		</StrictMode>
	);

} );
