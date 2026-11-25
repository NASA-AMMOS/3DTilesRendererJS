import { GeoJSONImageSource } from '../../src/three/plugins/images/sources/GeoJSONImageSource.js';

// Minimal stand in for a canvas and its 2d context that records the points that are drawn
function createCanvasStub() {

	const noop = () => {};

	const points = [];
	const canvas = { width: 0, height: 0 };
	const ctx = {
		canvas,
		save: noop,
		restore: noop,
		setTransform: noop,
		beginPath: noop,
		rect: noop,
		clip: noop,
		clearRect: noop,
		fill: noop,
		stroke: noop,
		ellipse: ( x, y ) => points.push( [ x, y ] ),
	};
	canvas.getContext = () => ctx;

	return { canvas, points };

}

describe( 'GeoJSONImageSource', () => {

	it( 'should skip features with a null geometry.', async () => {

		const source = new GeoJSONImageSource( {
			geojson: {
				type: 'FeatureCollection',
				features: [
					{ type: 'Feature', geometry: null, properties: { name: 'unlocated' } },
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [ 10, 20 ] }, properties: {} },
				],
			},
		} );

		await source.init();
		expect( source.contentBounds ).toEqual( [ 10, 20, 10, 20 ] );

		const { canvas, points } = createCanvasStub();
		source._drawToCanvas( canvas, [ 0, 0, 1, 1 ] );
		expect( points.length ).toBe( 1 );

	} );

	it( 'should draw features with null properties.', async () => {

		const source = new GeoJSONImageSource( {
			geojson: {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [ 10, 20 ] },
				properties: null,
			},
		} );

		await source.init();

		const { canvas, points } = createCanvasStub();
		source._drawToCanvas( canvas, [ 0, 0, 1, 1 ] );
		expect( points.length ).toBe( 1 );

	} );

} );
