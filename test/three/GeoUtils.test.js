import { MathUtils } from 'three';
import { toLatLonString } from '../../src/three/renderer/math/GeoUtils.js';

describe( 'toLatLonString', () => {

	it( 'should not drop a second when converting whole degrees from radians.', () => {

		const str = toLatLonString( - 86 * MathUtils.DEG2RAD, 10 * MathUtils.DEG2RAD );
		expect( str ).toBe( '86° 0\' 0" S 10° 0\' 0" E' );

	} );

	it( 'should not drop a second for fractional minutes.', () => {

		expect( toLatLonString( 88.5 * MathUtils.DEG2RAD, - 81.25 * MathUtils.DEG2RAD ) ).toBe( '88° 30\' 0" N 81° 15\' 0" W' );

	} );

	it( 'should still truncate partial seconds.', () => {

		const lat = ( 10 + 20 / 60 + 30.75 / 3600 ) * MathUtils.DEG2RAD;
		expect( toLatLonString( lat, 0 ) ).toBe( '10° 20\' 30" N 0° 0\' 0" E' );

	} );

} );
