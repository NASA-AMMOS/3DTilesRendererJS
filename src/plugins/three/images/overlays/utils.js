import { Vector3 } from 'three';

// iterates over all present tiles in the given tile set at the given level in the given range
export function forEachTileInBounds( range, level, tiling, callback ) {

	// pull the bounds in a bit to avoid loading unnecessary tiles
	let [ minLon, minLat, maxLon, maxLat ] = range;
	minLat += 1e-5;
	minLon += 1e-5;
	maxLat -= 1e-5;
	maxLon -= 1e-5;

	const clampedLevel = Math.max( Math.min( level, tiling.maxLevel ), tiling.minLevel );
	const [ minX, minY, maxX, maxY ] = tiling.getTilesInRange( minLon, minLat, maxLon, maxLat, clampedLevel );
	for ( let x = minX; x <= maxX; x ++ ) {

		for ( let y = minY; y <= maxY; y ++ ) {

			if ( tiling.getTileExists( x, y, clampedLevel ) ) {

				callback( x, y, clampedLevel );

			}

		}

	}

}

// returns the lat / lon range of the given geometry in addition to the normalized uvs
export function getGeometryCartographicRange( geometry, geomToEllipsoidMatrix, ellipsoid ) {

	const _vec = new Vector3();
	const _cart = {};

	geometry.computeBoundingBox();
	geometry.boundingBox.getCenter( _vec ).applyMatrix4( geomToEllipsoidMatrix );

	// find a rough mid lat / lon point
	ellipsoid.getPositionToCartographic( _vec, _cart );
	const centerLat = _cart.lat;
	const centerLon = _cart.lon;

	// find the lat / lon ranges
	let minLat = Infinity;
	let minLon = Infinity;
	let maxLat = - Infinity;
	let maxLon = - Infinity;

	const uv = [];
	const posAttr = geometry.getAttribute( 'position' );
	for ( let i = 0; i < posAttr.count; i ++ ) {

		// get the lat / lon values per vertex
		_vec.fromBufferAttribute( posAttr, i ).applyMatrix4( geomToEllipsoidMatrix );
		ellipsoid.getPositionToCartographic( _vec, _cart );

		// The latitude calculations are not so stable at the poles so force the lat value to
		// the mid point to ensure we don't load an unnecessarily large of tiles
		// NOTE: this can distort the texture a bit at the poles
		if ( Math.abs( Math.abs( _cart.lat ) - Math.PI / 2 ) < 1e-5 ) {

			_cart.lon = centerLon;

		}

		// ensure we're not wrapping on the same geometry
		if ( Math.abs( centerLon - _cart.lon ) > Math.PI ) {

			_cart.lon += Math.sign( centerLon - _cart.lon ) * Math.PI * 2;

		}

		if ( Math.abs( centerLat - _cart.lat ) > Math.PI ) {

			_cart.lat += Math.sign( centerLat - _cart.lat ) * Math.PI * 2;

		}

		uv.push( _cart.lon, _cart.lat );

		// save the min and max values
		minLat = Math.min( minLat, _cart.lat );
		maxLat = Math.max( maxLat, _cart.lat );

		minLon = Math.min( minLon, _cart.lon );
		maxLon = Math.max( maxLon, _cart.lon );

	}

	// remap the uvs
	const lonRange = maxLon - minLon;
	const latRange = maxLat - minLat;
	for ( let i = 0; i < uv.length; i += 2 ) {

		uv[ i + 0 ] -= minLon;
		uv[ i + 0 ] /= lonRange;

		uv[ i + 1 ] -= minLat;
		uv[ i + 1 ] /= latRange;

	}

	return {
		uv,
		range: [ minLon, minLat, maxLon, maxLat ],
	};

}
