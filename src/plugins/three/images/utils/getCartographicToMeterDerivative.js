import { Vector3 } from 'three';

const _v0 = /* @__PURE__ */ new Vector3();
const _v1 = /* @__PURE__ */ new Vector3();

export function getCartographicToMeterDerivative( ellipsoid, lat, lon ) {

	const EPS = 1e-5;
	const lonp = lon + EPS;
	let latp = lat + EPS;
	if ( Math.abs( latp ) > Math.PI / 2 ) {

		latp = latp - EPS;

	}

	ellipsoid.getCartographicToPosition( lat, lon, 0, _v0 );

	ellipsoid.getCartographicToPosition( latp, lon, 0, _v1 );
	const dy = _v0.distanceTo( _v1 ) / EPS;

	ellipsoid.getCartographicToPosition( lat, lonp, 0, _v1 );
	const dx = _v0.distanceTo( _v1 ) / EPS;

	return [ dx, dy ];

}
