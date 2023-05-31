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
