import { Color } from 'three';

/** Return a consistant random color for an index */
export const getIndexedRandomColor = ( () => {

	const colors = {};

	return ( index ) => {

		if ( ! colors[ index ] ) {

			const h = Math.random();
			const s = 0.5 + Math.random() * 0.5;
			const l = 0.375 + Math.random() * 0.25;

			colors[ index ] = new Color().setHSL( h, s, l );

		}
		return colors[ index ];

	};

} )();
