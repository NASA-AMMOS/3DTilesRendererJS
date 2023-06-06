import { Ellipsoid } from '../../';

export const WGS84_RADIUS = 6378137;

export const WGS84_FLATTENING = 1 / 298.257223563;

export const WGS84_HEIGHT = - ( WGS84_FLATTENING * WGS84_RADIUS - WGS84_RADIUS );

export const WGS84_ELLIPSOID = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );

export function swapToGeoFrame( target ) {

	const { x, y, z } = target;
	target.x = z;
	target.y = x;
	target.z = y;

}

export function swapToThreeFrame( target ) {

	const { x, y, z } = target;
	target.z = x;
	target.x = y;
	target.y = z;

}

export function sphericalPhiToLatitude( phi ) {

	return - ( phi - Math.PI / 2 );

}

export function latitudeToSphericalPhi( latitude ) {

	return - latitude + Math.PI / 2;

}
